// import { CategorySelector } from "../common/CategorySelector"
import { useEffect, useRef } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useSettings } from "@/app/contexts/SettingsContext";
import { matchCategories } from "@/app/lib/categoryMatcher";


export const CategorySection = () => {
  const { categories, setCategories, selectedFile, generated } = useSettings();
  const lastProcessedFileRef = useRef<File | null>(null);

  // Auto-populate categories when a file with metadata is selected
  useEffect(() => {
    if (selectedFile) {
      // Only process if this is a different file than the last one we processed
      if (lastProcessedFileRef.current === selectedFile) {
        return;
      }

      const metadata = generated.getMetadata(selectedFile);

      if (metadata && metadata.title && metadata.keywords) {
        console.log('🎯 Auto-matching categories for:', selectedFile.name);

        const matches = matchCategories(
          metadata.title,
          metadata.keywords,
          metadata.description
        );

        console.log('📊 Category matches:', matches);
        setCategories(matches);

        // Mark this file as processed
        lastProcessedFileRef.current = selectedFile;
      } else {
        console.log('⏳ Waiting for metadata for:', selectedFile.name);
      }
    }
  }, [selectedFile, generated, setCategories]);

  return (
    <div className="h-full w-full">
     <div className="select-none flex flex-col gap-4 h-full justify-center items-center ">
      <div className="w-full flex flex-col gap-2 items-center p-3">
        <h4 className="text-center text-l text-zinc-500">Adobe Stock</h4>
        <Select
          value={categories.adobeStock}
          onValueChange={(value) => setCategories({ adobeStock: value })}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1">Animals</SelectItem>
            <SelectItem value="2">Buildings</SelectItem>
            <SelectItem value="3">Business</SelectItem>
            <SelectItem value="4">Drinks</SelectItem>
            <SelectItem value="5">Environment</SelectItem>
            <SelectItem value="6">Mind</SelectItem>
            <SelectItem value="7">Food</SelectItem>
            <SelectItem value="8">Graphic</SelectItem>
            <SelectItem value="9">Hobby</SelectItem>
            <SelectItem value="10">Industry</SelectItem>
            <SelectItem value="11">Landscape</SelectItem>
            <SelectItem value="12">Lifestyle</SelectItem>
            <SelectItem value="13">People</SelectItem>
            <SelectItem value="14">Plant</SelectItem>
            <SelectItem value="15">Culture</SelectItem>
            <SelectItem value="16">Science</SelectItem>
            <SelectItem value="17">Social</SelectItem>
            <SelectItem value="18">Sport</SelectItem>
            <SelectItem value="19">Technology</SelectItem>
            <SelectItem value="20">Transport</SelectItem>
            <SelectItem value="21">Travel</SelectItem>
          </SelectContent>
        </Select>
      </div>
        <h4 className="text-center text-l text-zinc-500">ShutterStock</h4>
      <div className="flex gap-4 w-full px-3 ">
        <div className="w-full flex justify-center items-center">
          <Select
            value={categories.shutterStock1}
            onValueChange={(value) => setCategories({ shutterStock1: value })}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent >
              <SelectItem value="Abstract">Abstract</SelectItem>
              <SelectItem value="Animals/Wildlife">Animals/Wildlife</SelectItem>
              <SelectItem value="Arts">Arts</SelectItem>
              <SelectItem value="Backgrounds/Textures">
                Backgrounds/Textures
              </SelectItem>
              <SelectItem value="Beauty/Fashion">Beauty/Fashion</SelectItem>
              <SelectItem value="Buildings/Landmarks">
                Buildings/Landmarks
              </SelectItem>
              <SelectItem value="Business/Finance">Business/Finance</SelectItem>
              <SelectItem value="Celebrities">Celebrities</SelectItem>
              <SelectItem value="Education">Education</SelectItem>
              <SelectItem value="Food and drink">Food and drink</SelectItem>
              <SelectItem value="Healthcare/Medical">
                Healthcare/Medical
              </SelectItem>
              <SelectItem value="Holidays">Holidays</SelectItem>
              <SelectItem value="Industrial">Industrial</SelectItem>
              <SelectItem value="Interiors">Interiors</SelectItem>
              <SelectItem value="Miscellaneous">Miscellaneous</SelectItem>
              <SelectItem value="Nature">Nature</SelectItem>
              <SelectItem value="Objects">Objects</SelectItem>
              <SelectItem value="Parks/Outdoor">Parks/Outdoor</SelectItem>
              <SelectItem value="People">People</SelectItem>
              <SelectItem value="Religion">Religion</SelectItem>
              <SelectItem value="Science">Science</SelectItem>
              <SelectItem value="Signs/Symbols">Signs/Symbols</SelectItem>
              <SelectItem value="Sports/Recreation">
                Sports/Recreation
              </SelectItem>
              <SelectItem value="Technology">Technology</SelectItem>
              <SelectItem value="Transportation">Transportation</SelectItem>
              <SelectItem value="Vintage">Vintage</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="w-full flex justify-center items-center">
          <Select
            value={categories.shutterStock2}
            onValueChange={(value) => setCategories({ shutterStock2: value })}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent >
              <SelectItem value="Abstract">Abstract</SelectItem>
              <SelectItem value="Animals/Wildlife">Animals/Wildlife</SelectItem>
              <SelectItem value="Arts">Arts</SelectItem>
              <SelectItem value="Backgrounds/Textures">
                Backgrounds/Textures
              </SelectItem>
              <SelectItem value="Beauty/Fashion">Beauty/Fashion</SelectItem>
              <SelectItem value="Buildings/Landmarks">
                Buildings/Landmarks
              </SelectItem>
              <SelectItem value="Business/Finance">Business/Finance</SelectItem>
              <SelectItem value="Celebrities">Celebrities</SelectItem>
              <SelectItem value="Education">Education</SelectItem>
              <SelectItem value="Food and drink">Food and drink</SelectItem>
              <SelectItem value="Healthcare/Medical">
                Healthcare/Medical
              </SelectItem>
              <SelectItem value="Holidays">Holidays</SelectItem>
              <SelectItem value="Industrial">Industrial</SelectItem>
              <SelectItem value="Interiors">Interiors</SelectItem>
              <SelectItem value="Miscellaneous">Miscellaneous</SelectItem>
              <SelectItem value="Nature">Nature</SelectItem>
              <SelectItem value="Objects">Objects</SelectItem>
              <SelectItem value="Parks/Outdoor">Parks/Outdoor</SelectItem>
              <SelectItem value="People">People</SelectItem>
              <SelectItem value="Religion">Religion</SelectItem>
              <SelectItem value="Science">Science</SelectItem>
              <SelectItem value="Signs/Symbols">Signs/Symbols</SelectItem>
              <SelectItem value="Sports/Recreation">
                Sports/Recreation
              </SelectItem>
              <SelectItem value="Technology">Technology</SelectItem>
              <SelectItem value="Transportation">Transportation</SelectItem>
              <SelectItem value="Vintage">Vintage</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
    </div>
  )
}
