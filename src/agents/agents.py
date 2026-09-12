from __future__ import annotations

from functools import lru_cache

from langchain.agents import create_agent
from langchain_core.output_parsers import StrOutputParser
from langchain_core.prompts import ChatPromptTemplate
from langchain_openai import ChatOpenAI
from tenacity import retry, stop_after_attempt, wait_exponential

from src.config import get_settings
from src.schemas import CriticFeedback
from src.tools.tools import scrape_url, web_search
from src.utils.logger import get_logger

logger = get_logger(__name__)
settings = get_settings()


@lru_cache(maxsize=1)
def get_llm() -> ChatOpenAI:
    """Single shared LLM client, built once. Timeout + retries live at this layer
    so every agent/chain built on top of it inherits resilient network behaviour."""
    return ChatOpenAI(  # type: ignore[call-arg]  # langchain's Serializable base defeats mypy's pydantic plugin here
        model=settings.llm_model,
        temperature=settings.llm_temperature,
        timeout=settings.llm_timeout_seconds,
        max_retries=settings.llm_max_retries,
    )


def build_search_agent():
    return create_agent(model=get_llm(), tools=[web_search])


def build_reader_agent():
    return create_agent(model=get_llm(), tools=[scrape_url])


# ── Writer chain ──────────────────────────────────────────────────────────
_writer_prompt = ChatPromptTemplate.from_messages(
    [
        (
            "system",
            "You are an expert research writer. Write clear, structured and insightful reports.",
        ),
        (
            "human",
            """Write a detailed research report on the topic below.

Topic: {topic}

Research Gathered:
{research}

Structure the report as:
- Introduction
- Key Findings (minimum 3 well-explained points)
- Conclusion
- Sources (list all URLs found in the research)

Be detailed, factual and professional.""",
        ),
    ]
)

writer_chain = _writer_prompt | get_llm() | StrOutputParser()


# ── Critic chain (structured output) ────────────────────────────────────
_critic_prompt = ChatPromptTemplate.from_messages(
    [
        ("system", "You are a sharp and constructive research critic. Be honest and specific."),
        (
            "human",
            """Review the research report below and evaluate it strictly.

Report:
{report}

Score it out of 10, list concrete strengths, list concrete areas to improve,
and give a one-line verdict.""",
        ),
    ]
)

_structured_critic_llm = get_llm().with_structured_output(CriticFeedback)
critic_chain = _critic_prompt | _structured_critic_llm


@retry(stop=stop_after_attempt(2), wait=wait_exponential(multiplier=1, min=1, max=4))
def run_writer(topic: str, research: str) -> str:
    return writer_chain.invoke({"topic": topic, "research": research})


@retry(stop=stop_after_attempt(2), wait=wait_exponential(multiplier=1, min=1, max=4))
def run_critic(report: str) -> CriticFeedback:
    result = critic_chain.invoke({"report": report})
    # `with_structured_output` is typed to allow a raw dict depending on the
    # backend; ChatOpenAI + a Pydantic schema always returns the model instance,
    # but we coerce defensively so callers get a real CriticFeedback either way.
    if isinstance(result, CriticFeedback):
        return result
    return CriticFeedback.model_validate(result)
