import { asc, eq } from "drizzle-orm";
import { Router, type IRouter } from "express";
import { GetMenuResponse } from "@workspace/api-zod";
import { db, menuCategoriesTable, menuItemsTable } from "@workspace/db";
import { getDatabaseState } from "../lib/database-state";
import { builtInMenu } from "../lib/menu-catalog";

const router: IRouter = Router();

async function readMenuFromDatabase() {
  const [categories, items] = await Promise.all([
    db
      .select({
        id: menuCategoriesTable.id,
        titleEn: menuCategoriesTable.titleEn,
        titleAr: menuCategoriesTable.titleAr,
        sortOrder: menuCategoriesTable.sortOrder,
      })
      .from(menuCategoriesTable)
      .where(eq(menuCategoriesTable.active, true))
      .orderBy(asc(menuCategoriesTable.sortOrder)),
    db
      .select({
        id: menuItemsTable.id,
        categoryId: menuItemsTable.categoryId,
        nameEn: menuItemsTable.nameEn,
        nameAr: menuItemsTable.nameAr,
        descriptionEn: menuItemsTable.descriptionEn,
        descriptionAr: menuItemsTable.descriptionAr,
        price: menuItemsTable.price,
        calories: menuItemsTable.calories,
        imagePath: menuItemsTable.imagePath,
        featured: menuItemsTable.featured,
        sortOrder: menuItemsTable.sortOrder,
        available: menuItemsTable.available,
      })
      .from(menuItemsTable)
      .where(eq(menuItemsTable.available, true))
      .orderBy(asc(menuItemsTable.sortOrder)),
  ]);

  return GetMenuResponse.parse({
    categories: categories.map((category) => ({
      ...category,
      items: items.filter((item) => item.categoryId === category.id),
    })),
  });
}

router.get("/menu", async (req, res) => {
  // Until the database is connected, show the built-in menu right away
  // instead of making customers wait for a connection that will fail.
  if (getDatabaseState() !== "ready") {
    res.json(builtInMenu);
    return;
  }

  try {
    res.json(await readMenuFromDatabase());
  } catch (err) {
    req.log.error({ err }, "Could not read the menu from the database; serving the built-in menu");
    res.json(builtInMenu);
  }
});

export default router;
