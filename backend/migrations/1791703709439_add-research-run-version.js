export const up = (pgm) => {
  pgm.addColumn("research_runs", {
    version: {
      type: "integer",
      notNull: true,
      default: 1,
      check: "version >= 1",
    },
  });
};

export const down = (pgm) => {
  pgm.dropColumn("research_runs", "version");
};
