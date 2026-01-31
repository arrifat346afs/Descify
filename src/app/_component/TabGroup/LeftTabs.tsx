import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CategorySection } from "../category/CategorySection";
import { BatchProsess } from "../batch/BatchProsess";

const LeftTabs = () => {
  return (
    <div>
      <Tabs defaultValue="category">
         <TabsList className="w-full rounded-none bg-background">
          <TabsTrigger value="category">Category</TabsTrigger>
          <TabsTrigger value="batch">Batch</TabsTrigger>
        </TabsList>
        <TabsContent value="category">
          <CategorySection />
        </TabsContent>
        <TabsContent value="batch">
          {/* <BatchProsess /> */}
          <BatchProsess />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default LeftTabs;
