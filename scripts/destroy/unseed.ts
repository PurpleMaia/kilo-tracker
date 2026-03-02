import { db } from "@/db/kysely/client";

const TEST_EMAILS = [
    "john.doe@example.com",
    "jane.smith@example.com",
    "alice.johnson@example.com",
];

const TEST_ORG_SLUG = "test";

async function unseed() {
    // Delete members (cascade will handle this, but being explicit)
    console.log("Removing test organization members...");
    const org = await db
        .selectFrom("tenants")
        .select("id")
        .where("slug", "=", TEST_ORG_SLUG)
        .executeTakeFirst();

    if (org) {
        await db.deleteFrom("members").where("tenant_id", "=", org.id).execute();
    }

    // Delete test organization
    console.log("Removing test organization...");
    await db.deleteFrom("tenants").where("slug", "=", TEST_ORG_SLUG).execute();

    // Delete test accounts
    console.log("Removing test accounts...");
    await db.deleteFrom("users").where("email", "in", TEST_EMAILS).execute();

    console.log("Unseed complete.");
}

unseed().catch((error) => {
    console.error("Error removing seed data:", error);
}).finally(async () => {
    await db.destroy();
});
