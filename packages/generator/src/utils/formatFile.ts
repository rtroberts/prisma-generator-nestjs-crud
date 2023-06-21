import prettier from "prettier";

export const formatFile = async (content: string, writeLocation: string) => {
  try {
    const prettierConfig = await prettier.resolveConfig(writeLocation);

    const formatted = prettier.format(content, {
      ...prettierConfig,
      parser: "typescript",
    });

    return formatted;
  } catch (e) {
    console.log(e);
  }
  return content;
};
