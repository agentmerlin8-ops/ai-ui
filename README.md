# ai-ui

## Overview

Modern work happens across many disconnected systems: APIs, databases, GitHub, work tracking tools, documents, chat systems, file stores, and internal business applications. Today, connecting people to that information usually requires teams to build custom user interfaces for each workflow, each data source, and each role. This makes software expensive to build, slow to adapt, and difficult to personalize in real time.

The core hypothesis for this project is that a UI does not always need to be predesigned in full. Instead, an AI agent—potentially even one backed by a relatively low-cost model—may be able to compose, modify, and connect simple UI widgets on demand using natural-language instructions from a user.

## Vision

Build an experimental AI-driven UI workbench where users can request information and workflows in natural language, and the system dynamically creates or modifies the interface to support the task.

Example interaction:
- A user says: "Show me a list of invoices for customer XYZ."
- The system creates a grid widget in a canvas area showing relevant invoice fields.
- The user then says: "Tell me more about invoice 123."
- The system opens or transforms the interface to show detailed information for that invoice.
- Each widget is intentionally simple and acts as a stepping stone to other widgets, views, or actions.

The broader goal is to create a new human-computer interaction model that is less dependent on fixed screens, keyboard, and mouse, and more driven by voice, natural language, gesture, and adaptive presentation.

## Initial Product Direction

The first target use case is a developer workbench: a unified environment that helps a software builder interact with the systems they use most often.

Potential data sources and tools include:
- GitHub Copilot agent sessions
- GitHub repositories, issues, and pull requests
- Azure DevOps work items
- SharePoint files
- chat/context sources
- other software-delivery and knowledge-management systems

## Problem Statement

There is currently no simple, reliable framework for:
1. interpreting a user’s natural-language intent,
2. identifying the relevant data sources and actions,
3. selecting or generating appropriate UI widgets,
4. placing those widgets into a coherent workspace,
5. enabling iterative drill-down and refinement through continued conversation.

Most existing software assumes:
- workflows are known in advance,
- screens are statically designed,
- user needs are predictable,
- interaction happens primarily through mouse and keyboard.

This project challenges those assumptions.

## Research Question

Can an AI-guided system dynamically assemble and evolve a useful user interface from simple composable widgets, using natural language as the primary control mechanism, while remaining understandable, reliable, and efficient enough for real work?

## Near-Term Goals

- Define a minimal set of widget primitives
- Build a canvas-based workbench metaphor
- Support conversational widget creation and modification
- Integrate a small set of developer-focused data sources
- Instrument the system to evaluate accuracy, usability, trust, and speed

## Long-Term Goal

Establish a rigorous, experiment-driven foundation for a new class of software experience: systems where the interface itself is not fixed in advance, but is continuously shaped by user intent through natural language, and eventually voice and gesture.
