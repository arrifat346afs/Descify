import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CategorySection } from "../category/CategorySection";
import { BatchProsess } from "../batch/BatchProsess";
import { useAppSelector, useAppDispatch } from "@/store/hooks";
import { setActiveLeftTab } from "@/store/slices/uiSlice";

const LeftTabs = () => {
  const dispatch = useAppDispatch();
  const activeTab = useAppSelector(state => state.ui.activeLeftTab);

  return (
    <div>
      <Tabs value={activeTab} onValueChange={(value) => dispatch(setActiveLeftTab(value as 'category' | 'batch'))}>
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
