import { ForYouFeed } from "@/components/insights/ForYouFeed";

export const metadata = {
  title: "For you",
  description: "Products picked for you on ShopNGo, based on what you buy, save, search and look at.",
};

export default function ForYouPage() {
  return <ForYouFeed />;
}
