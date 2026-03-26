import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CategorySection } from "../category/CategorySection";
import { ConsoleViewer } from "@/components/ConsoleViewer";
import { useAppSelector, useAppDispatch } from "@/store/hooks";
import { setActiveLeftTab } from "@/store/slices/uiSlice";

const LeftTabs = () => {
  const dispatch = useAppDispatch();
  const activeTab = useAppSelector(state => state.ui.activeLeftTab);

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <Tabs value={activeTab} onValueChange={(value) => dispatch(setActiveLeftTab(value as 'category' | 'log'))} className="h-full flex flex-col overflow-hidden">
         <TabsList className="w-full rounded-none bg-background shrink-0">
          <TabsTrigger value="category">Category</TabsTrigger>
          <TabsTrigger value="log">Log</TabsTrigger>
        </TabsList>
        <TabsContent value="category" className="flex-1 mt-0 min-h-0 overflow-hidden">
          <CategorySection />
        </TabsContent>
        <TabsContent value="log" className="flex-1 mt-0 min-h-0 overflow-hidden">
          <ConsoleViewer />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default LeftTabs;
