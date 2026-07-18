import assert from "node:assert/strict";
import test from "node:test";
import { createAiReviewContext } from "../src/features/ai/projectContext.ts";
import { accumulateStreamingChunk, createBrowserAiProvider, createLocalOpenAiProvider, extractStreamingAssistantText, parseAiAssistantReply, parseOpenAiModelIds, resolveChatCompletionsUrl, resolveModelsUrl } from "../src/features/ai/providers.ts";

test("local OpenAI-compatible URLs accept base and endpoint forms without credentials", () => {
  assert.equal(resolveChatCompletionsUrl("http://127.0.0.1:1234"), "http://127.0.0.1:1234/v1/chat/completions");
  assert.equal(resolveChatCompletionsUrl("http://localhost:8080/v1"), "http://localhost:8080/v1/chat/completions");
  assert.equal(resolveChatCompletionsUrl("https://models.example/v1/chat/completions"), "https://models.example/v1/chat/completions");
  assert.equal(resolveModelsUrl("https://models.example/v1"), "https://models.example/v1/models");
  assert.throws(() => resolveChatCompletionsUrl("ftp://localhost/model"), /HTTP or HTTPS/);
  assert.throws(() => resolveChatCompletionsUrl("http://user:secret@localhost:8080"), /Credentials are not allowed/);
});

test("local connection test discovers selectable models without credentials or a prior model selection", async () => {
  const previousFetch = globalThis.fetch;
  let captured;
  globalThis.fetch = async (url, init) => {
    captured = { url, init };
    return Response.json({ object: "list", data: [{ id: "model-b" }, { id: "model-a" }, { id: "model-b" }, { id: " " }] });
  };
  try {
    const result = await createLocalOpenAiProvider({ baseUrl: "http://127.0.0.1:1234", model: "" }).test(new AbortController().signal);
    assert.equal(captured.url, "http://127.0.0.1:1234/v1/models");
    assert.deepEqual(captured.init.headers, { Accept: "application/json" });
    assert.equal("Authorization" in captured.init.headers, false);
    assert.deepEqual(result, { message: "Connected. Models loaded.", models: ["model-b", "model-a"] });
  } finally {
    globalThis.fetch = previousFetch;
  }
});

test("model discovery rejects unsupported and empty model lists", () => {
  assert.throws(() => parseOpenAiModelIds({ models: [] }), /unsupported model list/);
  assert.deepEqual(parseOpenAiModelIds({ data: [{ id: "" }, {}, null] }), []);
});

test("local provider sends URL and model without authorization headers", async () => {
  const previousFetch = globalThis.fetch;
  let captured;
  const streamed = [];
  globalThis.fetch = async (url, init) => {
    captured = { url, init };
    const deltas = ['{"answer":"Use ', 'UUID for the public identifier.","suggestions":[]}'];
    const events = `${deltas.map((content) => `data: ${JSON.stringify({ choices: [{ delta: { content } }] })}\n\n`).join("")}data: [DONE]\n\n`;
    return new Response(events, { status: 200, headers: { "Content-Type": "text/event-stream" } });
  };
  try {
    const provider = createLocalOpenAiProvider({ baseUrl: "http://127.0.0.1:1234", model: "local-model" });
    const reply = await provider.generate({ instruction: "Recommend a type", history: [], context: { models: [] }, signal: new AbortController().signal, onProgress: (text) => streamed.push(text) });
    assert.equal(reply.text, "Use UUID for the public identifier.");
    assert.equal(streamed.at(-1), "Use UUID for the public identifier.");
    assert.equal(captured.url, "http://127.0.0.1:1234/v1/chat/completions");
    assert.deepEqual(captured.init.headers, { "Content-Type": "application/json", Accept: "text/event-stream, application/json" });
    assert.deepEqual({ model: JSON.parse(captured.init.body).model, stream: JSON.parse(captured.init.body).stream }, { model: "local-model", stream: true });
  } finally {
    globalThis.fetch = previousFetch;
  }
});

test("browser provider uses Chrome Prompt API initial prompts, schema, and cancellation", async () => {
  const previousLanguageModel = globalThis.LanguageModel;
  let createOptions;
  let promptOptions;
  let destroyed = false;
  const streamed = [];
  globalThis.LanguageModel = {
    async availability() { return "available"; },
    async create(options) {
      createOptions = options;
      return {
        promptStreaming(_input, options) {
          promptOptions = options;
          const chunks = ['{"answer":"Keep', '{"answer":"Keep the identifier as UUID.","suggestions":[]}'];
          return new ReadableStream({ start(controller) { chunks.forEach((chunk) => controller.enqueue(chunk)); controller.close(); } });
        },
        async prompt() { throw new Error("request-based prompt should not be used"); },
        destroy() { destroyed = true; }
      };
    }
  };
  try {
    const controller = new AbortController();
    const reply = await createBrowserAiProvider().generate({ instruction: "Review the ID", history: [], context: { models: [] }, signal: controller.signal, onProgress: (text) => streamed.push(text) });
    assert.equal(reply.text, "Keep the identifier as UUID.");
    assert.equal(streamed.at(-1), "Keep the identifier as UUID.");
    assert.equal(createOptions.initialPrompts[0].role, "system");
    assert.equal(createOptions.signal, controller.signal);
    assert.equal(promptOptions.signal, controller.signal);
    assert.equal(promptOptions.omitResponseConstraintInput, true);
    assert.equal(promptOptions.responseConstraint.type, "object");
    assert.equal(destroyed, true);
  } finally {
    globalThis.LanguageModel = previousLanguageModel;
  }
});

test("streaming helpers handle incremental, cumulative, and partial structured output", () => {
  assert.equal(accumulateStreamingChunk("abc", "def"), "abcdef");
  assert.equal(accumulateStreamingChunk("abc", "abcdef"), "abcdef");
  assert.equal(extractStreamingAssistantText('{"answer":"Line 1\\nLine'), "Line 1\nLine");
  assert.equal(extractStreamingAssistantText("Plain partial response"), "Plain partial response");
});

test("assistant replies validate structured suggestions and preserve plain text fallback", () => {
  const structured = parseAiAssistantReply(JSON.stringify({
    answer: "Split addresses into a reusable model.",
    suggestions: [{ id: "split-address", kind: "model_split", targetIds: ["order"], title: "Extract address", rationale: "The fields form a reusable concept.", tradeoffs: ["Adds a relationship"], alternatives: ["Keep fields inline"] }]
  }));
  assert.equal(structured.suggestions.length, 1);
  assert.equal(structured.suggestions[0].kind, "model_split");
  assert.deepEqual(parseAiAssistantReply("A short plain-text answer."), { text: "A short plain-text answer.", suggestions: [] });
});

test("AI review context is scoped and excludes editor geometry", () => {
  const models = [
    { id: "order", title: "Order", description: "Purchase", fields: [{ id: "order-id", name: "ID", primaryKey: true, important: true, domainId: "uuid" }], x: 100, y: 200, role: "transaction", dependency: "independent", hasPrivacy: false, maturedLevel: 2, rotation: 0 },
    { id: "customer", title: "Customer", description: "Buyer", fields: [], x: 300, y: 200, role: "master", dependency: "independent", hasPrivacy: true, maturedLevel: 2, rotation: 0 },
    { id: "unrelated", title: "Audit", description: "Log", fields: [], x: 500, y: 200, role: "history", dependency: "independent", hasPrivacy: false, maturedLevel: 2, rotation: 0 }
  ];
  const context = createAiReviewContext({
    project: { id: "p1", name: "Shop" },
    activeCanvas: { id: "main", name: "Main", kind: "erd" },
    canvasModelIds: ["order", "customer"],
    models,
    domains: [{ id: "uuid", name: "UUID", categoryId: "builtin", shape: "primitive", primitiveType: "uuid", components: [] }],
    relationships: [{ id: "r1", name: "buyer", sourceId: "order", targetId: "customer", sourceMultiplicity: "0..*", targetMultiplicity: "1", direction: "source-to-target", kind: "foreign-key" }],
    relationshipReferences: [],
    dfd: { canvases: [], nodes: [], flows: [], groups: [] }
  }, { kind: "erd-canvas", id: "main", title: "Main", selectedModelIds: ["order"] });
  assert.deepEqual(context.models.map((model) => model.id), ["order", "customer"]);
  assert.equal("x" in context.models[0], false);
  assert.equal("y" in context.models[0], false);
  assert.deepEqual(context.domains.map((domain) => domain.id), ["uuid"]);
});
