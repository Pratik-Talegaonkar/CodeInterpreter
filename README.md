CodeInterpreter is a tool that explains source code line by line.

You give it a folder of code.
It gives you back explanations that stay aligned with the actual lines, respect the file structure, and don’t pretend everything is obvious.

This project exists because most “AI code explanation” tools fall apart the moment you give them a real codebase instead of a 20-line snippet.

What CodeInterpreter Does

Takes a folder of source code (not just one file)

Walks the directory structure recursively

Detects the programming language per file

Breaks code into manageable chunks so token limits don’t explode

Sends those chunks to a large language model using API keys

Produces:

Line-by-line explanations

File-level summaries

Structured output that can be validated and rendered cleanly

The output stays aligned with the original code.
Line numbers match. Formatting is preserved. No magical rewriting.

What This Project Is Not

Not a chatbot wrapper

Not a copy-paste toy

Not “AI magic”

If the model doesn’t know something, the system is designed to say “unknown” instead of hallucinating.

Why This Exists

I’m learning AI engineering, and I wanted a project that forces me to deal with the hard parts:

Token budgeting

Chunking strategies

Prompt design that doesn’t lie

API key security

Cost control

Handling large, messy inputs

This project is deliberately more complicated than a tutorial because real systems are complicated.

Supported Languages

Initial support includes:

Python

Java

C / C++

JavaScript

HTML / CSS

The architecture is language-agnostic and designed to be extended.

Example Output
{
  "file": "src/utils/math.py",
  "language": "python",
  "summary": "Utility functions for basic arithmetic operations.",
  "lines": [
    {
      "line_number": 1,
      "code": "def add(a, b):",
      "explanation": "Defines a function named add that takes two parameters."
    },
    {
      "line_number": 2,
      "code": "    return a + b",
      "explanation": "Returns the sum of the two input values."
    }
  ]
}


The real output is stricter and validated before being displayed.

High-Level Architecture

CodeInterpreter is split into three layers:

Frontend
Displays the file tree, source code, and explanations side by side.

Backend
Handles file ingestion, token estimation, chunking, caching, and API calls.

AI Layer
Responsible for prompt construction, retries, validation, and consistency checks.

The frontend never sees API keys. Ever.

Code Processing Pipeline

Files are scanned and filtered

Language is detected per file

Code is chunked by structure and size

Each chunk is explained with full file context

Outputs are validated against a strict schema

Results are cached to avoid repeated API calls

This pipeline exists because sending entire files to an LLM is a rookie mistake.

Security Considerations

API keys are stored server-side only

Requests are rate-limited

Prompt injection via comments is handled explicitly

Large or malicious inputs are rejected early

This isn’t paranoia. This is table stakes.

Project Status

This is an active learning project.

Features are added intentionally, not rushed.
Correctness is valued more than clever tricks.

Future Work

Streaming explanations for large repositories

Function-level and call-graph explanations

Support for self-hosted open-source models

Smarter caching and diff-based re-explanations

Final Notes

If you’re looking for a flashy demo, this isn’t it.
If you’re interested in how LLMs behave inside real systems, this project is exactly about that.
