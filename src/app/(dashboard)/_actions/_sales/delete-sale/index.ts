"use server";
import { actionClient } from "@/app/_lib/safe-action";
import { deleteSaleSchema } from "./schema";
import { db } from "@/app/_lib/prisma";
import { revalidatePath } from "next/cache";

export const deleteSale = actionClient
  .schema(deleteSaleSchema)
  .action(async ({ parsedInput: { id } }) => {
    await db.$transaction(async (trx) => {
      const sale = await trx.sale.findUnique({
        where: { id },
        include: { products: true },
      });
      if (!sale) throw new Error("Sale not found");
      await trx.sale.delete({ where: { id: id } });
      // para cada produto da venda incrementamos novamente a quantidade no estoque
      for (const product of sale.products) {
        await trx.product.update({
          where: { id: product.productId },
          data: { stock: { increment: product.quantity } },
        });
      }
    });

    revalidatePath("/dashboard/sales");
    revalidatePath("/dashboard/products");
    revalidatePath("/dashboard/dash");
  });
