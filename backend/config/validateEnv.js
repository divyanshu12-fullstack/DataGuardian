import { cleanEnv, str, port } from "envalid";

export default function validateEnv() {
  return cleanEnv(process.env, {
    PORT: port(),
    MONGO_URI: str(),
    GEMINI_API_KEY: str(),
    NODE_ENV: str({ choices: ["development", "test", "production"] }),
  });
}
