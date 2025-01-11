---
title: "what is an AI agent?"
pubDate: 2025-01-11
---

This year is going to be big for AI.

We're seeing the emergence of more powerful
models with improved reasoning capabilities, nuanced "mixture-of-experts"
architectures, and better
software integrations. Major tech companies are racing to build the best foundation
model possible, indie-hackers are building impressive consumer platforms on top of AI,
and open-source alternatives are becoming increasingly sophisticated.

The hype-word you’re going to hear _a lot_ around all this is **“agent”** -
you’ve probably already heard someone say _“AI agent”_, _"autonomous agent"_, or _"agent workforce"_ at one point or another.

_**What exactly is an agent? And why should you care?**_

Technically speaking, an agent is a software system that utilizes an LLM
to make model driven decisions on a wide variety of non-deterministic inputs.
Such an LLM will have been trained on using "tools". Tools are functions within your code that
have well defined schemas (oftentimes serialized to JSON) that the model can
understand and call. LLMs trained on tool calling understand how to interpret
this schema and return the necessary JSON to call the tool. Then, your program
can unmarshal that JSON, interpret which function is being called from the LLM,
and execute that tool’s function in code!

Some LLM providers define this capability of their models as [“Function calling”](https://platform.openai.com/docs/guides/function-calling)
or ["Tool use"](https://docs.anthropic.com/en/docs/build-with-claude/tool-use).

It's important to understand how tools work since it's the entire linchpin on
making agents autonomous at scale.
We can inspect how this all happens under the hood using Ollama and Llama3.2 via JSON payloads to the Ollama
API and its `/api/chat` endpoint.

Let's start with a simple user question alongside a tool the model can use:

```json
{
  "model": "llama3.2",
  "messages": [
    // The end user question
    {
      "role": "user",
      "content": "What is 2 + 3?"
    }
  ],
  "stream": false,

  // list of tools available for the LLM to call
  "tools": [
    {
      "type": "function",
      "function": {
        // a simple calculator function for doing basic math with 2 ints
        "name": "calculator",

        // this tells the LLM what this tool is and how to use it
        "description": "Supports mathematical calculations like addition, subtraction, multiplication, and division",
        "parameters": {
          "type": "object",

          // these serializable parameters are very important: "a", "b",
          // and "operation" are required while "operation" can only
          // be one of the provided enum vals. This tells the LLM how to
          // craft the JSON it'll return back since our program
          // needs to be able to unmarshal the response correctly in 
          // order to pass it into the tool's function in code.

          "properties": {
            "a": {
              "type": "int",
              "description": "The first value in the calculation"
            },
            "b": {
              "type": "int",
              "description": "The second value in the calculation"
            },
            "operation": {
              "type": "string",
              "description": "The operation to perform",
              "enum": ["addition", "subtraction", "multiplication", "division"]
            }
          },
          "required": ["a", "b", "operation"]
        }
      }
    }
  ]
}
```

In this example, we've added a `tools` array that has a very simple `calculator`
function that the model can call: this tool requires 3 parameters: `a`, `b`
(the two integers going through the calculator), and `operation` (which defines what
type of calculation to do).

Llama3.2 responds with:

```json
{
  "model": "llama3.2",
  "created_at": "2025-01-11T17:34:38.875308Z",
  "message": {
    "role": "assistant",

    // no actual content from the LLM ...
    "content": "",

    // but! It did decide to make a tool call!
    "tool_calls": [
      {
        "function": {
          "name": "calculator",
          "arguments": {
            "a": "2",
            "b": "3",
            "operation": "addition"
          }
        }
      }
    ]
  },
  "done_reason": "stop",
  "done": true,
  "total_duration": 888263167,
  "load_duration": 35374083,
  "prompt_eval_count": 218,
  "prompt_eval_duration": 496000000,
  "eval_count": 29,
  "eval_duration": 355000000
}
```

Importantly, the `content` is empty _but_ the `tool_calls` array contains a
call to the `calculator` tool with the correct arguments. Within our code, after calling the Ollama API, 
we can unmarshal that JSON,
inspect the `a`, `b`, and `operation` arguments, and pass them to the connected
function.

A simple calculator tool might look something like:

```go
// calculator is a simple mathematical calculation tool that supports
// addition subtraction, multiplication, and division.
// It will return an error if an unsupported operation is given.
func calculator(num1 int, num2 int, operation string) (float64, error) {
    switch operation {
    case "addition":
        return float64(num1 + num2), nil

    case "subtraction":
        return float64(num1 - num2), nil

    case "multiplication":
        return float64(num1 * num2), nil

    case "division":
        if num2 == 0 {
            return 0, errors.New("cannot divide by zero")
        }
        return float64(num1) / float64(num2), nil

    default:
        return 0, errors.New("invalid operation")
    }
}
```

Actually calling the tool in code looks vastly different for different languages and
frameworks, but, abstractly, what needs to be done is:

1. Get the response from the Ollama API
2. Get the tool calls from that payload
3. Validate each tool call and destructure them from JSON into memory
4. Deduce which tool is being called via the tool's name
5. Call the tool's function in code with the validated arguments
6. return the results back to the LLM

```go
// CalculatorArguments are the arguments for the calculator tool
type CalculatorArguments struct {
    A         int    `json:"a"`
    B         int    `json:"b"`
    Operation string `json:"operation"`
}

// ...
// After calling the Ollama API and getting back an "ollama_response",
// process each tool call in the reponse body

for _, call := range ollama_response.message.tool_calls {

    // process the calculator tool calls
    if call.function.name == "calculator" {
        var args CalculatorArguments

        // Unmarshal the calculator arguments from JSON into memory.
        // This will error if the LLM malformed the parameters
        // or hallucinated a parm that doesn't exist in CalculatorArguments.
        if err := json.Unmarshal(call.function.arguments, &args); err != nil {
            return 0, fmt.Errorf("failed to unmarshal calculator arguments: %w", err)
        }

        // Call the calculator function with the validated args
        return calculator(args.A, args.B, args.Operation)
    }
}
```

After calling the tool's function, using the messages array, we can return the results of the function execution _back_ to the LLM.
This includes what has come before in the message history (like the user's original question, the tool call from the LLM, a possible system prompt, etc.):

```json
{
  "model": "llama3.2",
  "messages": [
    // the user's original message
    {
      "role": "user",
      "content": "What is 2 + 3?"
    },

    // the LLM's tool call
    {
      "role": "assistant",
      "content": "",
      "tool_calls": [
        {
          "function": {
            "name": "calculator",
            "arguments": {
              "a": "2",
              "b": "3",
              "operation": "addition"
            }
          }
        }
      ]
    },

    // the results of the tool call in code
    {
      "role": "tool",
      "tool_call_id": "tool_call_id_1",
      "content": "5"
    }
  ],
  "stream": false,
  "tools": [
    {
      "type": "function",
      "function": {
        "name": "calculator",
        "description": "Supports mathematical calculations like addition, subtraction, multiplication, and division",
        "parameters": {
          "type": "object",
          "properties": {
            "a": {
              "type": "int",
              "description": "The first value in the calculation"
            },
            "b": {
              "type": "int",
              "description": "The second value in the calculation"
            },
            "operation": {
              "type": "string",
              "description": "The operation to perform",
              "enum": ["addition", "subtraction", "multiplication", "division"]
            }
          },
          "required": ["a", "b", "operation"]
        }
      }
    }
  ]
}'
```

```json
{
  "model": "llama3.2",
  "created_at": "2025-01-11T17:51:32.440709Z",
  "message": {
    "role": "assistant",
    "content": "The answer to the question \"What is 2 + 3?\" is 5."
  },
  "done_reason": "stop",
  "done": true,
  "total_duration": 787422875,
  "load_duration": 32508375,
  "prompt_eval_count": 100,
  "prompt_eval_duration": 524000000,
  "eval_count": 19,
  "eval_duration": 227000000
}
```

With just a bit of prompt engineering, we can get the LLM to handle
errors that occur or fix things in the schema it may have hallucinated (which happens
more often than you'd think!) -
by adding a system message at the beginning of the messages array:

```json
{
  "role": "system",
  "content": "You must use the provided tools to perform calculations. When a tool errors, you must make another tool call with a valid tool. Do not provide direct answers without using tools."
},
```

we can instruct the LLM to try again when there are problems:

```json
{
  "model": "llama3.2",
  "messages": [
    // The new system message (at the start of all the messages)
    {
      "role": "system",
      "content": "You must use the provided tools to perform calculations. When a tool errors, you must make another tool call with a valid tool. Do not provide direct answers without using tools."
    },

    // The original message from the end user
    {
      "role": "user",
      "content": "What is 2 + 3?"
    },

    // The LLM's tool call - notice that it called a tool it "hallucinated".
    // There are lots of different types of problems: improper input
    // formatting, incorrect schemas, missing parameters, hallucinated
    // parameters, misplaced quotes, malformed json, etc. etc.
    {
      "role": "assistant",
      "content": "",
      "tool_calls": [
        {
          "function": {
            "name": "hallucinated_tool"
          }
        }
      ]
    },

    // The resulting error from the system
    {
      "role": "tool",
      "tool_call_id": "tool_call_id_1",
      "content": "error: no tool named: hallucinated_tool: try again with a valid tool"
    }
  ],
  "stream": false,
  "tools": [
    {
      "type": "function",
      "function": {
        "name": "calculator",
        "description": "Supports mathematical calculations like addition, subtraction, multiplication, and division",
        "parameters": {
          "type": "object",
          "properties": {
            "a": {
              "type": "int",
              "description": "The first value in the calculation"
            },
            "b": {
              "type": "int",
              "description": "The second value in the calculation"
            },
            "operation": {
              "type": "string",
              "description": "The operation to perform",
              "enum": ["addition", "subtraction", "multiplication", "division"]
            }
          },
          "required": ["a", "b", "operation"]
        }
      }
    }
  ]
}'
```

In this example, I've injected an error where the LLM attempted to call a tool that
does not exist and can't be handled by our framework:

```json
{
  "role": "tool",
  "tool_call_id": "tool_call_id_1",
  "content": "error: no tool named: hallucinated_tool: try again with a valid tool"
}
```

The LLM sees this context, follows the system prompt, and attempts to try again
with the right tool:

```json
{
  "model": "llama3.2",
  "created_at": "2025-01-11T18:00:45.732164Z",
  "message": {
    "role": "assistant",
    "content": "",

    // It tried again!
    "tool_calls": [
      {
        "function": {
          "name": "calculator",
          "arguments": {
            "a": "2",
            "b": "3",
            "operation": "addition"
          }
        }
      }
    ]
  },
  "done_reason": "stop",
  "done": true,
  "total_duration": 850036291,
  "load_duration": 27454875,
  "prompt_eval_count": 348,
  "prompt_eval_duration": 569000000,
  "eval_count": 31,
  "eval_duration": 677000000
}
```

---

Obviously, this is a tedious process having to hand craft JSON and messages to send
back and forth to the system. Frameworks like Langchain make it simple to integrate your code with LLM providers and tools by
abstracting this loop into libraries like [Pydantic](https://docs.pydantic.dev/latest/) for data validation
and [`@tool`](https://python.langchain.com/docs/concepts/tools/) for defining an LLM's toolkit.
Or, at a more high level, LangChain's [LangGraph](https://python.langchain.com/docs/introduction/) library can be used to craft stateful agents
with its various building-blocks. Again, it's worth understanding this tool calling back and
forth since it is the most critical piece of how agents integrate into big,
scaled systems. Often, libraries like LangChain abstract all that away
and when problems occur, it can be challenging to understand what's going on
under the hood if you don't understand this flow.

Once you have a set of tools and well defined functions with schemas, you
can begin to scale this methodology and build autonomous units that make decisions
and tool calls based on inputs
from users or your broader system. Again, this is all rounded out by good prompt-engineering:
you can instruct your agent on how to react to certain scenarios, how to handle
errors, in what ways to interface with _other agents_, and overall, sculpt its behaviors to fit your needs.

At its heart, an agent is this: a nearly autonomous system that can handle
non-deterministic situations based on your instructions and the tools you’ve
given it.

Building an agent means ingraining LLMs deeper into your code and APIs, letting
them handle things that would typically be difficult for a traditional software
system to tackle (like understanding natural language, deciphering audio inputs, summarizing large blocks of text, etc.).
They can be made to handle feedback from the system, take continuous action
based on the results of their tool calls, and even interact with other agents
to achieve their goals.

As agents and AI become ubiquitous with building software systems at large, we
should think about good opportunities to integrate them: I’m
bullish on AI being a net productivity win for everyone, **but we should also
understand that it is NOT a silver bullet for all problems.** Anthropic made an
excellent document titled [“Building effective agents”](https://www.anthropic.com/research/building-effective-agents) 
that chronicles “When (and when not) to use agents”:

> When building applications with LLMs, we recommend finding the simplest solution
possible, and only increasing complexity when needed. This might mean not
building agentic systems at all. Agentic systems often trade latency and cost
for better task performance, and you should consider when this tradeoff makes sense.

> When more complexity is warranted, workflows offer predictability and
consistency for well-defined tasks, whereas agents are the better option when
flexibility and model-driven decision-making are needed at scale. For many
applications, however, optimizing single LLM calls with retrieval and in-context
examples is usually enough.

I think this is worth saying again: _"agents are the better option when flexibility 
and model-driven decision-making are needed at scale"_. But they are not always
the best option.

These are still non-deterministic systems: there's always the possibility that
an agent or copilot or AI system will make the wrong decision, despite how good
the underlying model is or how well crafted the prompts are: there will always
be a margin for error with AI based systems.

AI systems and agents also start to fall apart as you go "deeper": remember, as
of today, the context window for most of these models cannot fit huge documents
or large codebases
(or all the libraries that those codebases consume) and they'll often get
"confused" as the instructions, lists of tools, or contexts get more and more complex. This is
why one-shots, simple workflows, or basic ML algorithms for AI systems can often times get you most of the way there.
We shouldn't abandon years and years of well understood predictive systems for
agents that are more complex, require significantly more compute power, are more
expensive, are slow, and have higher margins for error.

I’m excited for this year and what new technologies will come to market. But I'm
remembering that the hype around AI is very real. And while adopting these
technologies is exciting, understanding _where_ they fit best will be optimal
leverage for ensuring success when integrating these tools into existing
systems.
