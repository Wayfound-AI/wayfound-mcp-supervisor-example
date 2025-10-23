import "dotenv/config";
import { query } from "@anthropic-ai/claude-agent-sdk";
import chalk from "chalk";

// Helper function to highlight tool names in orange
function highlightTools(text) {
  const toolPattern = /\b(Task|Read|Write|Edit|WebSearch|Bash|mcp__\w+)\b/g;
  return text.replace(toolPattern, (match) => chalk.hex("#FFA500")(match));
}

// Get stock ticker from command line
const ticker = process.argv[2];

if (!ticker) {
  console.error("Usage: node index.js <TICKER>");
  console.error("Example: node index.js AAPL");
  process.exit(1);
}

console.log(chalk.cyan("=".repeat(80)));
console.log(chalk.bold.cyan(`STOCK RESEARCH AGENT - Analyzing ${ticker}`));
console.log(chalk.cyan("=".repeat(80)));
console.log();

async function runStockResearch() {
  // Track current subagent for logging
  let currentSubagent = null;
  let webSearchCount = 0;

  const prompt = `
Research the stock ticker ${ticker} and produce a comprehensive investment research report.

Todays Date: ${new Date().toLocaleDateString()}

The Wayfound Agent ID is: ${process.env.WAYFOUND_AGENT_ID}

Your task:
1. Get the Wayfound agent guidelines to be aware of during execution

2. Delegate to 'web-researcher': Gather current info about ${ticker} (news, financials, analyst opinions, trends). Keep research concise.

3. Delegate to 'report-writer': Write a professional 2-3 page research report. Pass ONLY the key findings in a brief summary, not a huge data dump. The report file will be named ${ticker}_research_report_<version>.md

4. Get the Wayfound session transcript schema

5. Determine the correctly formatted JSON transcript of the research session **including the report file markdown content in FULL** and evaluate using Wayfound

6. If the Wayfound evaluation results in a grade of A-, A, or A+, you are done. 
If the grade is lower than A-, iterate by delegating back to 'report-writer' to revise the report based on the feedback from Wayfound.
Repeat the evaluation until you achieve an A- or better.

IMPORTANT: 
Keep delegations concise. 
Summarize research findings before passing to report-writer.
ALWAYS read and include the full report markdown content in the Wayfound evaluation transcript.`;

  const response = query({
    prompt: prompt,
    options: {
      maxTurns: 50,
      allowedTools: [
        "Task",
        "Read",
        "mcp__wayfound__get_agent_details",
        "mcp__wayfound__evaluate_session",
        "mcp__wayfound__get_session_transcript_json_schema",
      ],
      includePartialMessages: true,

      // Add MCP server for Wayfound evaluation
      mcpServers: {
        // wayfound: wayfoundServer,
        wayfound: {
          type: "sse",
          url: "https://cburnette.ngrok.io/sse",
          headers: {
            Authorization: `Bearer ${process.env.WAYFOUND_MCP_KEY}`,
          },
        },
      },

      // Auto-approve all tool usage with hard limit on web searches
      canUseTool: async (toolName, input) => {
        if (toolName === "WebSearch") {
          webSearchCount++;
          console.log();
          console.log(
            chalk.yellow(`[PERMISSION] `) +
              highlightTools(`WebSearch request #${webSearchCount}/3`)
          );

          if (webSearchCount > 3) {
            console.log(
              chalk.yellow(`[PERMISSION] `) +
                chalk.red(`BLOCKING `) +
                highlightTools(toolName) +
                ` - limit of 3 searches reached`
            );
            return {
              behavior: "deny",
              message:
                "You have reached the maximum limit of 3 web searches. Please summarize your findings and return them now.",
              interrupt: false,
            };
          }
        }

        console.log();
        console.log(
          chalk.yellow(`[PERMISSION] `) +
            `Auto-approving ` +
            highlightTools(toolName)
        );
        return {
          behavior: "allow",
          updatedInput: input,
        };
      },

      systemPrompt: `You are a stock research coordinator. Your job is to orchestrate the research process by delegating to specialized subagents.

IMPORTANT:
- Use the Task tool to delegate research and writing work to subagents
- After the report is written, YOU MUST call the mcp__wayfound__evaluate_session tool`,

      // Define sub-agents
      agents: {
        "web-researcher": {
          description:
            "Agent that searches the web for current stock information, news, and market data",
          tools: ["WebSearch"],
          prompt: `You are a financial web research specialist. Search the web for current information about the requested stock ticker.

IMPORTANT: You have a HARD LIMIT of 3 web searches. Be extremely strategic and efficient. Choose your search queries carefully.

Focus on:
- Recent news and press releases
- Financial metrics and performance data
- Analyst ratings and price targets
- Market sentiment and trends
- Competitive analysis

After completing your 3 searches (or if blocked from searching), return a CONCISE summary:
- Use bullet points
- Keep each finding to 1-2 sentences maximum
- Total summary should be no more than 15-20 bullet points
- Focus on the most important insights only`,
          model: "sonnet",
        },

        "report-writer": {
          description:
            "Agent that writes comprehensive, professional investment research reports",
          tools: ["Write", "Read"],
          prompt: `You are a professional investment research report writer. Based on the brief research summary provided, write a concise, professional research report.

Include these sections: Executive Summary, Company Overview, Recent Developments, Financial Analysis, Market Position, Investment Recommendation, Risk Factors, and Conclusion.

CRITICAL INSTRUCTIONS:
- <version> MUST be incremented with each revision (start at v1)
- File name MUST be exactly: ${ticker}_research_report_<version>.md
- Write in markdown format
- Keep it concise: 2-3 pages maximum
- Work quickly - don't overthink
- Use the research summary provided, don't elaborate excessively
- Complete the task in ONE action`,
          model: "sonnet",
        },
      },
    },
  });

  // Handle streaming output with detailed logging
  let assistantText = "";
  let lastMessageTime = Date.now();
  let assistantTextStarted = false;

  console.log(
    chalk.gray(`[STREAMING] Starting to listen for Claude responses...`)
  );

  for await (const message of response) {
    const timeSinceLastMessage = Date.now() - lastMessageTime;
    if (timeSinceLastMessage > 2000) {
      console.log();
      console.log(
        chalk.gray(
          `[STREAMING] Received message after ${(
            timeSinceLastMessage / 1000
          ).toFixed(1)}s wait (type: ${message.type})`
        )
      );
    }
    lastMessageTime = Date.now();

    if (message.type === "system" && message.subtype === "init") {
      console.log(chalk.cyan(`[SYSTEM] `) + `Initialized`);
      console.log(chalk.cyan(`[SYSTEM] `) + `Model: ${message.model}`);
      console.log(
        chalk.cyan(`[SYSTEM] `) +
          `Available tools: ` +
          highlightTools(message.tools.join(", "))
      );
      const agentsList = message.agents?.length
        ? message.agents.map((a) => chalk.hex("#4A90E2")(a)).join(", ")
        : "none";
      console.log(chalk.cyan(`[SYSTEM] `) + `Available agents: ${agentsList}`);
      console.log(chalk.gray(`[STREAMING] Waiting for Claude LLM response...`));
      console.log();
    } else if (message.type === "user") {
      if (message.parent_tool_use_id) {
        // Subagent is being invoked
        console.log();
        console.log(chalk.magenta(`${"=".repeat(80)}`));
        console.log(
          chalk.magenta(`[SUBAGENT] `) +
            `Delegating to: ` +
            chalk.hex("#4A90E2")(currentSubagent || "unknown")
        );
        console.log(
          chalk.magenta(`[SUBAGENT] `) +
            `Tool use ID: ${message.parent_tool_use_id}`
        );
        console.log(chalk.magenta(`${"=".repeat(80)}`));
        console.log(
          chalk.gray(`[STREAMING] `) +
            `Waiting for subagent (` +
            chalk.hex("#4A90E2")(currentSubagent) +
            `) Claude LLM response...`
        );
      } else {
        console.log(chalk.blue(`[USER] `) + `New user message received`);
      }
      assistantText = "";
      assistantTextStarted = false;
    } else if (message.type === "stream_event") {
      const event = message.event;

      if (event.type === "message_start") {
        console.log(
          chalk.gray(`[STREAMING] Claude response streaming started...`)
        );
        assistantText = "";
        assistantTextStarted = false;
      } else if (
        event.type === "content_block_delta" &&
        event.delta?.type === "text_delta"
      ) {
        if (!assistantTextStarted) {
          process.stdout.write(chalk.hex("#FFB6C1")("[STOCK RESEARCH AGENT] "));
          assistantTextStarted = true;
        }
        assistantText += event.delta.text;
        process.stdout.write(chalk.white(event.delta.text));
      } else if (event.type === "message_delta" && event.delta?.stop_reason) {
        console.log();
        console.log(
          chalk.gray(`[STREAMING] `) +
            `Claude response complete (reason: ${event.delta.stop_reason})`
        );
        console.log(
          chalk.gray(`[STREAMING] Waiting for next Claude LLM response...`)
        );
      }
    } else if (message.type === "assistant") {
      if (assistantTextStarted) {
        console.log();
      }
      console.log(
        chalk.green(`[ASSISTANT] `) +
          `Message completed (${message.message.content.length} content blocks)`
      );

      // Check if there are tool uses
      const toolUses = message.message.content.filter(
        (c) => c.type === "tool_use"
      );
      if (toolUses.length > 0) {
        console.log(
          chalk.green(`[ASSISTANT] `) +
            `Requested ${toolUses.length} tool(s): ` +
            highlightTools(toolUses.map((t) => t.name).join(", "))
        );

        // Track subagent if Task tool is being used
        const taskTool = toolUses.find((t) => t.name === "Task");
        if (taskTool && taskTool.input?.subagent_type) {
          currentSubagent = taskTool.input.subagent_type;
        }

        console.log(
          chalk.gray(`[STREAMING] `) +
            `Executing tools, then waiting for next Claude LLM response...`
        );
      }
    } else if (message.type === "result") {
      console.log();
      console.log(chalk.green("=".repeat(80)));
      console.log(chalk.green(`[RESULT] `) + `Research completed!`);
      console.log(
        chalk.green(`[RESULT] `) + `Duration: ${message.duration_ms}ms`
      );
      console.log(chalk.green(`[RESULT] `) + `Turns: ${message.num_turns}`);
      console.log(
        chalk.green(`[RESULT] `) + `Cost: $${message.total_cost_usd.toFixed(4)}`
      );

      if (message.subtype === "success") {
        console.log(chalk.green(`[RESULT] Status: SUCCESS`));
        console.log(chalk.white(`\n[OUTPUT] `) + `${message.result}`);
      } else {
        console.log(chalk.red(`[RESULT] Status: ${message.subtype}`));
      }

      console.log(chalk.green("=".repeat(80)));
    }
  }
}

// Run the research
runStockResearch().catch((error) => {
  console.log();
  console.error(chalk.red("[ERROR]"), error.message);
  console.error(chalk.dim(error.stack));
  process.exit(1);
});
