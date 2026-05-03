import { CategorySection } from "../category/CategorySection";
import { MetadataSection } from "../metadeta/MetadataSection";

const LeftTabs = () => {
  return (
    <div className="h-full flex flex-col overflow-hidden">
      <MetadataSection />
      <CategorySection />
    </div>
  );
};

export default LeftTabs;
