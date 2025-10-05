import "dotenv/config";
import { query } from "@anthropic-ai/claude-agent-sdk";
import * as readline from "readline";

let sessionId = null;

async function handleQuery(userMessage) {
  const response = query({
    prompt: userMessage,
    options: {
      maxTurns: 20,
      allowedTools: [],
      includePartialMessages: true,
      resume: sessionId,
      continue: sessionId !== null,
    },
  });

  process.stdout.write("\nAssistant: ");

  for await (const message of response) {
    if (message.type === "system" && message.subtype === "init") {
      sessionId = message.session_id;
    } else if (message.type === "stream_event") {
      const event = message.event;
      if (
        event.type === "content_block_delta" &&
        event.delta?.type === "text_delta"
      ) {
        process.stdout.write(event.delta.text);
      }
    }
  }

  process.stdout.write("\n");
}

async function main() {
  console.log('Agent ready! Type your message (or "exit" to quit)');

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  rl.setPrompt("\nYou: ");
  rl.prompt();

  rl.on("line", async (input) => {
    const text = input.trim();

    if (text === "exit" || text === "quit") {
      console.log("Goodbye!");
      rl.close();
      process.exit(0);
    }

    if (text) {
      await handleQuery(text);
    }

    rl.prompt();
  });
}

main().catch((error) => {
  console.error("Error:", error.message);
  process.exit(1);
});
