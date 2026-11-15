import { fileURLToPath } from "node:url";
import { resolve as resolvePath, extname } from "node:path";

export async function resolve(specifier, context, nextResolve) {
  try {
    return await nextResolve(specifier, context);
  } catch (error) {
    if (
      error?.code !== "ERR_MODULE_NOT_FOUND" ||
      !specifier.startsWith(".") ||
      extname(specifier)
    ) {
      throw error;
    }

    const parentPath = fileURLToPath(context.parentURL);
    const candidate = resolvePath(parentPath, "..", specifier);
    return nextResolve(`${specifier}.ts`, context);
  }
}
