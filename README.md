# Wayfound MCP Supervisor - Stock Research Agent Example

> **Add AI supervision to any agentic system in minutes with Model Context Protocol (MCP)**

This example demonstrates how to integrate [Wayfound's](https://wayfound.ai) AI supervisor into an agentic workflow using the Model Context Protocol. With just a few lines of code, your agents can:

- 📋 Access quality guidelines and best practices before starting work
- 🎯 Get supervisor analysis identifying common pitfalls to avoid
- 💡 Receive improvement suggestions from historical session data
- ✅ Evaluate outputs against quality standards with letter grades
- 🔄 Iterate automatically based on supervisor feedback until quality thresholds are met

## The Challenge

Building reliable agentic systems is hard. Agents can produce inconsistent outputs, miss critical requirements, or develop bad habits over time. Traditional approaches require:

- Manual prompt engineering and testing
- Hard-coded validation rules that don't evolve
- No feedback loop for continuous improvement
- Black-box evaluation with no transparency

## The Wayfound Solution

Wayfound acts as an **AI supervisor** that trains, guides, and evaluates your agents in real-time. By connecting via MCP, your agents can:

1. **Learn before acting** - Query supervisor guidelines and common issues
2. **Get evaluated** - Submit session transcripts for comprehensive quality grading
3. **Improve iteratively** - Use detailed feedback to refine outputs automatically

Best of all? **It's just configuration.** No major code refactoring required.

## Live Example Output

This repo contains a stock research agent that generates investment reports. Watch how Wayfound supervision elevates quality:

```bash
$ npm start AAPL

================================================================================
STOCK RESEARCH AGENT - Analyzing AAPL
================================================================================

[ASSISTANT] I'll help you research AAPL and produce a comprehensive investment
research report, following the Wayfound quality standards. Let me start by
gathering the necessary guidance...

[ASSISTANT] Requested tool: mcp__wayfound__get_agent_details
[ASSISTANT] Requested tool: mcp__wayfound__get_supervisor_analysis_for_agent
[ASSISTANT] Requested tool: mcp__wayfound__get_improvement_suggestions_for_agent

[ASSISTANT] Perfect! I now have the quality guidelines and context:

**Quality Guidelines:**
1. Reports must include an executive summary
2. Financial data must cite sources
3. Investment recommendations must be clearly stated
4. Risk factors must be disclosed
5. Professional, unbiased tone required

**Key Issues from Past Reports:**
- Missing source citations for financial data (56% of sessions)
- Internal inconsistencies between metadata and report body
- Incomplete quality review execution
- Missing balance sheet metrics and valuation methodology

Now let me delegate to the specialized agents...

[SUBAGENT] Delegating to: web-researcher
[SUBAGENT] Delegating to: report-writer

[ASSISTANT] Perfect! The report looks good with proper citations. Now I need
to submit it to Wayfound for evaluation...

[ASSISTANT] Requested tool: mcp__wayfound__evaluate_session

[ASSISTANT] Excellent! The report received an **A grade** from Wayfound! 🎉

================================================================================
[RESULT] Research completed!
[RESULT] Duration: 257572ms (4.3 minutes)
[RESULT] Turns: 28
[RESULT] Cost: $0.7041
[RESULT] Status: SUCCESS
================================================================================

## ✅ AAPL Research Report Complete - Grade: A

**Wayfound Grade: A** (exceeds the A- threshold requirement)

**All Guidelines Met:**
- ✅ Executive Summary included
- ✅ Financial data properly cited with sources
- ✅ Clear investment recommendation stated
- ✅ Comprehensive risk factors disclosed
- ✅ Professional, unbiased tone throughout

### 🔍 Process Followed

1. **Reviewed Wayfound guidelines** upfront to understand quality requirements
2. **Delegated to web-researcher** agent to gather current AAPL data
3. **Delegated to report-writer** agent to create professional report
4. **Submitted to Wayfound** for evaluation with complete session transcript
5. **Achieved A grade** on first submission - no iteration needed!
```

## How It Works

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  Stock Research Agent (Claude Sonnet)                       │
│                                                             │
│  1. Query Wayfound guidelines via MCP                       │
│  2. Delegate to web-researcher subagent                     │
│  3. Delegate to report-writer subagent                      │
│  4. Submit transcript to Wayfound for evaluation            │
│  5. Iterate if grade < A-, or finish if grade ≥ A-          │
└─────────────────────────────────────────────────────────────┘
                           │
                           │ MCP Connection
                           ↓
┌─────────────────────────────────────────────────────────────┐
│  Wayfound Supervisor (via MCP)                              │
│                                                             │
│  Tools Available:                                           │
│  • mcp__wayfound__get_agent_details                         │
│  • mcp__wayfound__get_supervisor_analysis_for_agent         │
│  • mcp__wayfound__get_improvement_suggestions_for_agent     │
│  • mcp__wayfound__evaluate_session                          │
│  • mcp__wayfound__get_session_analysis                      │
└─────────────────────────────────────────────────────────────┘
```

### The Integration (That's It!)

Adding Wayfound supervision to your Claude Agent SDK workflow requires just **3 lines of configuration**:

```javascript
const response = query({
  prompt: "Research AAPL and produce an investment report...",
  options: {
    // 👇 Add Wayfound MCP Server - that's it!
    mcpServers: {
      wayfound: {
        type: "sse",
        url: "https://app.wayfound.ai/sse",
        headers: {
          Authorization: `Bearer ${process.env.WAYFOUND_MCP_KEY}`,
        },
      },
    },

    // Your agents can now call Wayfound tools
    agents: {
      "report-writer": {
        description: "Writes investment research reports",
        prompt: `You are a professional report writer...`,
      },
    },
  },
});
```

That's it! Your agent now has access to:

- `mcp__wayfound__get_agent_details` - Get quality guidelines
- `mcp__wayfound__get_supervisor_analysis_for_agent` - Understand common issues
- `mcp__wayfound__get_improvement_suggestions_for_agent` - Learn from past sessions
- `mcp__wayfound__evaluate_session` - Submit transcripts for grading
- `mcp__wayfound__get_session_analysis` - Get detailed evaluation breakdown

### What Makes This Powerful

**Before Wayfound:**

```
Agent → Generate Report → Hope it's good → Manual review needed
```

**With Wayfound:**

```
Agent → Get Guidelines → Generate Report → Evaluate → Grade A? → Done
                                              ↓ Grade < A-
                                      Revise with Feedback
```

The agent **learns** from supervisor feedback and **improves automatically** until quality standards are met.

## Setup & Installation

### Prerequisites

1. **Wayfound Account** - [Sign up at wayfound.ai](https://www.wayfound.ai/request-a-demo)
2. **Node.js 18+** - Required for Claude Agent SDK
3. **Anthropic API Key** - [Get from Anthropic Console](https://console.anthropic.com/)

### Installation

```bash
# Clone this repository
git clone https://github.com/Wayfound-AI/wayfound-mcp-supervisor-example.git
cd wayfound-mcp-supervisor-example

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your credentials:
#   ANTHROPIC_API_KEY=your_anthropic_key
#   WAYFOUND_MCP_KEY=your_wayfound_mcp_key
#   WAYFOUND_AGENT_ID=your_agent_id
```

### Configuration

1. **Get your Wayfound credentials:**

   - Log into [Wayfound Dashboard](https://app.wayfound.ai)
   - Create a new agent or select existing
   - Copy your Agent ID and MCP API Key

2. **Update `.env` file:**
   ```bash
   ANTHROPIC_API_KEY=...
   WAYFOUND_MCP_KEY=...
   WAYFOUND_AGENT_ID=...
   ```

### Running the Example

```bash
# Generate a research report for any stock ticker
npm start AAPL

# Try other tickers
npm start MSFT
npm start TSLA
npm start NVDA
```

The agent will:

1. Query Wayfound for quality guidelines
2. Research the stock using web searches
3. Generate a professional investment report
4. Submit to Wayfound for evaluation
5. Iterate until achieving A- grade or better

Generated reports are saved as `{TICKER}_research_report_v{N}.md`

## Code Structure

```
wayfound-mcp-supervisor-example/
├── index.js                 # Main agent orchestrator
├── package.json            # Dependencies
├── .env                    # Environment variables (create this)
└── README.md              # You are here
```

**Key Components:**

- **Main Agent** (lines 30-51): Orchestrates workflow and calls Wayfound tools
- **MCP Configuration** (lines 60-68): Connects to Wayfound supervisor
- **Web Researcher Subagent** (lines 87-106): Gathers current stock data
- **Report Writer Subagent** (lines 109-124): Creates professional reports

## Why This Matters for Your Business

### Traditional Agent Development

- ❌ Manual prompt engineering takes weeks
- ❌ No visibility into quality issues until production
- ❌ Agents develop bad habits over time
- ❌ Inconsistent outputs require human review
- ❌ No automated improvement loop

### With Wayfound MCP Supervision

- ✅ **5 minutes to integrate** - Just add MCP config
- ✅ **Real-time guidance** - Agents learn best practices before acting
- ✅ **Automated quality gates** - Only A-grade outputs ship
- ✅ **Continuous improvement** - System learns from every session
- ✅ **Full transparency** - Detailed evaluation breakdowns

## Learn More

- **Wayfound Documentation:** [docs.wayfound.ai](https://docs.wayfound.ai)
- **MCP Protocol:** [modelcontextprotocol.io](https://modelcontextprotocol.io)
- **Claude Agent SDK:** [github.com/anthropics/anthropic-agent-sdk](https://github.com/anthropics/anthropic-agent-sdk)

## Support

- **Issues:** [GitHub Issues](https://github.com/Wayfound-AI/wayfound-mcp-supervisor-example/issues)
- **Wayfound Support:** support@wayfound.ai
- **Sales Inquiries:** hello@wayfound.ai

## License

MIT License - see [LICENSE](LICENSE) file for details.

---

**Ready to add AI supervision to your agentic systems?** [Get started with Wayfound →](https://wayfound.ai)
