# CodeInterpreter

## Overview

CodeInterpreter is a tool that explains source code line by line.

You give it a folder of code.  
You get back explanations that stay aligned with the actual lines, respect the file structure, and do not pretend everything is obvious.

This project exists because most AI code explanation tools fall apart the moment you give them a real codebase instead of a short snippet.

---

## What CodeInterpreter Does

- Takes a folder of source code (not just one file)
- Walks the directory structure recursively
- Detects the programming language per file
- Breaks code into manageable chunks so token limits do not explode
- Sends those chunks to a large language model using API keys
- Produces:
  - Line-by-line explanations
  - File-level summaries
  - Structured output that can be validated and rendered cleanly

The output stays aligned with the original code.  
Line numbers match. Formatting is preserved.

---

## What This Project Is Not

- Not a chatbot wrapper
- Not a copy-paste toy
- Not AI magic

If the model does not know something, the system is designed to say "unknown" instead of hallucinating.

---

## Why This Exists

I am learning AI engineering, and I wanted a project that forces me to deal with the hard parts:

- Token budgeting
- Chunking strategies
- Prompt design that does not lie
- API key security
- Cost control
- Handling large, messy inputs

This project is deliberately more complicated than a tutorial because real systems are complicated.

---

## Supported Languages

- Python
- Java
- C / C++
- JavaScript
- HTML / CSS

The architecture is language-agnostic and designed to be extended.

---
