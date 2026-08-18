import ItemCard from "@/components/item/item-card";
import { checkValidSponsor } from "@/lib/utils";
import type { ItemListQueryResult } from "@/sanity.types";
import SponsorItemCard from "./item-card-sponsor";

interface ItemGridClientProps {
  items: ItemListQueryResult;
}

/**
 * ItemGrid Client Component
 *
 * 1. show sponsor item card when item.sponsor is true
 * 2. otherwise show item card (16:9 image + favicon + category chips)
 */
export default function ItemGridClient({ items }: ItemGridClientProps) {
  return (
    <div>
      {items && items.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {items.map((item) =>
            checkValidSponsor(item) ? (
              <SponsorItemCard key={item._id} item={item} />
            ) : (
              <ItemCard key={item._id} item={item} />
            ),
          )}
        </div>
      )}
    </div>
  );
}
