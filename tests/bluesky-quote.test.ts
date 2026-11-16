import assert from "node:assert/strict";
import test from "node:test";
import { parseBlueskyQuote } from "../lib/social/bluesky-quote.ts";

test("quoted Bluesky posts include author, text, URL and external-card context", () => {
  const quote = parseBlueskyQuote({
    $type: "app.bsky.embed.record#view",
    record: {
      uri: "at://did:plc:example/app.bsky.feed.post/quoted-key",
      author: {
        handle: "bengoessling.bsky.social",
        displayName: "Ben Goessling",
      },
      value: { text: "After sacking Jordan Love eight times." },
      embeds: [
        {
          $type: "app.bsky.embed.external#view",
          external: {
            title: "Vikings defense steals the show",
            description: "The Vikings delivered a historic pass rush.",
          },
        },
      ],
    },
  });

  assert.deepEqual(quote, {
    author: "Ben Goessling",
    handle: "bengoessling.bsky.social",
    text: "After sacking Jordan Love eight times.",
    url: "https://bsky.app/profile/bengoessling.bsky.social/post/quoted-key",
    linkTitle: "Vikings defense steals the show",
    linkDescription: "The Vikings delivered a historic pass rush.",
  });
});

test("record-with-media quotes are parsed and incomplete quotes are omitted", () => {
  assert.equal(
    parseBlueskyQuote({
      $type: "app.bsky.embed.recordWithMedia#view",
      record: {
        uri: "at://did:plc:example/app.bsky.feed.post/quoted-key",
        author: { handle: "quoted.bsky.social" },
        value: { text: "Referenced post" },
      },
      media: { $type: "app.bsky.embed.images#view", images: [] },
    })?.text,
    "Referenced post",
  );
  assert.equal(
    parseBlueskyQuote({
      record: {
        author: { handle: "quoted.bsky.social" },
        value: { text: " " },
      },
    }),
    undefined,
  );
});
