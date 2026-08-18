"use client";

import { urlForIcon, urlForImage } from "@/lib/image";
import { cn } from "@/lib/utils";
import type { ItemInfo } from "@/types";
import { AwardIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Skeleton } from "../ui/skeleton";

type ItemCardProps = {
  item: ItemInfo;
};

/**
 * ItemCard shows item cover image, icon, name, description and category chips
 * (moge.ai style: 16:9 screenshot on top, favicon + title row, 2-line description,
 * category chips at the bottom)
 */
export default function ItemCard({ item }: ItemCardProps) {
  const imageProps = item?.image ? urlForImage(item.image) : null;
  const imageBlurDataURL = item?.image?.blurDataURL || null;
  const iconProps = item?.icon ? urlForIcon(item.icon) : null;
  const itemUrlPrefix = "/item";

  return (
    <div
      className={cn(
        "group flex flex-col justify-between gap-2 rounded-lg border bg-background pb-[18px]",
        "transition-colors duration-300 hover:bg-accent/40",
      )}
    >
      {/* top */}
      <div className="flex flex-col gap-4">
        {/* Image container */}
        <Link
          href={`${itemUrlPrefix}/${item.slug.current}`}
          prefetch={false}
          className="block"
        >
          <div className="relative aspect-[16/9] overflow-hidden rounded-t-md border-b transition-all">
            {imageProps && (
              <Image
                src={imageProps?.src}
                alt={item.image.alt || `image of ${item.name}`}
                title={item.image.alt || `image of ${item.name}`}
                fill
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                className="object-cover image-scale"
                {...(imageBlurDataURL && {
                  placeholder: "blur",
                  blurDataURL: imageBlurDataURL,
                })}
              />
            )}
          </div>
        </Link>

        {/* icon + name + description */}
        <Link
          href={`${itemUrlPrefix}/${item.slug.current}`}
          prefetch={false}
          className="group flex flex-col gap-4"
        >
          <div className="flex flex-col gap-4 px-4">
            <div className="flex items-center justify-between gap-2">
              {iconProps && (
                <Image
                  src={iconProps?.src}
                  alt={item.icon.alt || `icon of ${item.name}`}
                  width={20}
                  height={20}
                  className="size-5 shrink-0 object-contain"
                />
              )}
              <h3 className="min-w-0 flex-1 truncate text-ellipsis font-semibold text-xl">
                <span
                  className={cn(
                    "truncate group-hover:text-primary inline-flex items-center gap-1",
                    item.featured && "text-gradient_indigo-purple",
                  )}
                >
                  {item.featured && (
                    <AwardIcon className="w-4 h-4 flex-shrink-0 text-indigo-500" />
                  )}
                  <span className="truncate">{item.name}</span>
                </span>
              </h3>
            </div>
            {/* min-h-[3rem] is used for making sure height of the card is the same */}
            <p className="line-clamp-2 min-h-[3rem] text-sm leading-relaxed">
              {item.description}
            </p>
          </div>
        </Link>
      </div>

      {/* bottom: category chips */}
      <div className="flex h-6 flex-wrap gap-[6px] overflow-hidden px-4">
        {item.categories?.slice(0, 3).map((category) => (
          <Link
            key={category._id}
            title={category.name}
            href={`/category/${category.slug.current}`}
            className="flex min-w-0 items-center truncate rounded bg-muted px-1.5 text-muted-foreground text-xs leading-6 hover:bg-accent hover:text-primary dark:border"
          >
            <span className="truncate">{category.name}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}

export function ItemCardSkeleton() {
  return (
    <div className="flex flex-col gap-2 border rounded-lg pb-[18px]">
      <Skeleton className="w-full aspect-[16/9] rounded-b-none" />
      <div className="flex flex-col gap-4 px-4">
        <div className="flex items-center gap-2">
          <Skeleton className="size-5" />
          <Skeleton className="h-6 w-1/2" />
        </div>
        <Skeleton className="h-10 w-full" />
      </div>
      <div className="flex gap-[6px] px-4">
        <Skeleton className="h-6 w-20" />
        <Skeleton className="h-6 w-24" />
      </div>
    </div>
  );
}
