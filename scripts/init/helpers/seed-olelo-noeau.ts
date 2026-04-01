import { db } from "@/db/kysely/client";

const OLELO_NOEAU = [
  "I ka wā ma mua, ka wā ma hope. — The future is found in the past.",
  "ʻAʻohe hana nui ke alu ʻia. — No task is too big when done together.",
  "He aliʻi ka ʻāina; he kauwā ke kanaka. — The land is chief; man is its servant.",
  "ʻAʻohe puʻu kiʻekiʻe ke hoʻāʻo ʻia e piʻi. — No cliff is so tall it cannot be climbed.",
  "E lawe i ke aʻo a mālama, a e ʻoi mau ka na'auao. — Take wisdom and care for it, and intelligence will grow.",
  "Ua ola loko i ke aloha. — Love gives life within.",
  "He ʻolina leo ka ke aloha. — Joy is in the voice of love.",
  "Mālama i ka ʻāina, mālama i ke kai. — Care for the land, care for the sea.",
  "Kulia i ka nuʻu. — Strive for the summit.",
  "Nānā ka maka; hoʻolohe ka pepeiao; paʻa ka waha. — Observe with the eyes; listen with the ears; shut the mouth.",
];

async function seed() {
  const rows = OLELO_NOEAU.map((text) => ({ text }));

  console.log("Seeding 10 ʻōlelo noʻeau...");
  await db.insertInto("olelo_noeau").values(rows).execute();
  console.log("Done.");
}

seed()
  .catch((error) => {
    console.error("Error seeding ʻōlelo noʻeau:", error);
  })
  .finally(async () => {
    await db.destroy();
  });
