import { pool } from "./src/config/database.js";

async function main() {
  // Check current run statuses
  const status = await pool.query("SELECT id, question, status FROM research_runs ORDER BY created_at DESC");
  console.log("Current run statuses:");
  console.table(status.rows.map(r => ({ id: r.id.slice(0,8)+'...', status: r.status, q: r.question.slice(0,40) })));

  // Check if any reports were saved
  const reports = await pool.query("SELECT id, run_id, title, length(markdown_content) as content_len FROM reports LIMIT 5");
  console.log("\nReports in DB:", reports.rowCount);
  if (reports.rows.length) console.table(reports.rows);

  // Reset any stuck running runs (running -> failed -> pending)
  const stuck = await pool.query("SELECT id FROM research_runs WHERE status = 'running'");
  if (stuck.rows.length > 0) {
    console.log(`\nResetting ${stuck.rows.length} stuck running run(s)...`);
    await pool.query("UPDATE research_runs SET status = 'failed', error_message = 'Pipeline timed out - reset' WHERE status = 'running'");
    await pool.query("UPDATE research_runs SET status = 'pending', error_message = NULL WHERE status = 'failed'");
    console.log("Done - all runs reset to pending");
  } else {
    console.log("\nNo stuck runs found.");
  }

  await pool.end();
}

main().catch(console.error);
