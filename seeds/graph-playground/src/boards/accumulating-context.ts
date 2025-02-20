/**
 * @license
 * Copyright 2023 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { Board } from "@google-labs/breadboard";
import { Starter } from "@google-labs/llm-starter";

const board = new Board();
const kit = board.addKit(Starter);

// Store input node so that we can refer back to it to create a conversation
// loop.
const input = board.input("Chat with me", {
  $id: "userRequest",
  schema: {
    type: "object",
    properties: {
      text: {
        type: "string",
        title: "User",
        description: "Type here to chat with the assistant",
      },
    },
    required: ["text"],
  },
});

// Store prompt node for the same reason.
const prompt = kit.promptTemplate(
  "This is a conversation between a friendly assistant and their user. You are the assistant and your job is to try to be helpful, empathetic, and fun.\n{{context}}\n\n== Current Conversation\nuser: {{question}}\nassistant:",
  { context: "", $id: "assistant" }
);

// Use the `append` node to accumulate the conversation history.
// Populate it with initial context.
const conversationMemory = kit.append({
  accumulator: "\n== Conversation History",
  $id: "conversationMemory",
});
// Wire memory to accumulate: loop it to itself.
conversationMemory.wire("accumulator->", conversationMemory);

board.passthrough({ $id: "start" }).wire(
  "->",
  input
    .wire(
      "text->question",
      prompt.wire(
        "prompt->text",
        kit
          .generateText({ $id: "generator" })
          .wire("<-PALM_KEY.", kit.secrets(["PALM_KEY"]))
          .wire(
            "completion->assistant",
            conversationMemory.wire("accumulator->context", prompt)
          )
          .wire(
            "completion->text",
            board
              .output({
                $id: "assistantResponse",
                schema: {
                  type: "object",
                  properties: {
                    text: {
                      type: "string",
                      title: "Assistant",
                      description:
                        "Assistant's response in the conversation with the user",
                    },
                  },
                  required: ["text"],
                },
              })
              .wire("->", input)
          )
      )
    )
    .wire("text->user", conversationMemory)
);

export default board;
