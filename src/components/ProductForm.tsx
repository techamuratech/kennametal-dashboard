"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import {
  getCategories,
  createProduct,
  updateProduct,
  createLogEntry,
  getRelatedParts,
  RelatedPart,
  uploadFile,
} from "@/lib/firestore-service";
import { useAuth } from "@/lib/auth-context";
import ClassicEditor from "@ckeditor/ckeditor5-build-classic";
import { CKEditor } from "@ckeditor/ckeditor5-react";
import LoadingSpinner from "@/components/LoadingSpinner";

interface ProductFormProps {
  productData?: any;
  isEditing?: boolean;
}

export default function ProductForm({
  productData,
  isEditing = false,
}: ProductFormProps) {
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();
  const { userData } = useAuth();
  const [relatedParts, setRelatedParts] = useState<RelatedPart[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("");

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm({
    defaultValues: {
      title: "",
      subtitle: "",
      overview: "",
      categoryId: "",
      material_number: "",
      iso: "",
      shank_size: "",
      cutting_condition: [],
      abrasive: "",
      machine_hp: "",
      cutting_material: "",
      application: [{ uses: "", icon: "" }],
      images: ["", ""],
      product_img: "",
      overview_img: "",
      overviewPoints: [{}],
      related_parts: [],
      featured: false,
      productPrice: 0,
    },
  });

  const [applicationFields, setApplicationFields] = useState([
    { uses: "", icon: "" },
  ]);
  const [overviewPointsFields, setOverviewPointsFields] = useState<
    Record<string, string>[]
  >([{}]);
  const [imageFiles, setImageFiles] = useState<{ [key: string]: File | null }>(
    {}
  );
  const [selectedRelatedParts, setSelectedRelatedParts] = useState<string[]>([]);

  const addApplicationField = () => {
    setApplicationFields([...applicationFields, { uses: "", icon: "" }]);
  };

  const removeApplicationField = (index: number) => {
    if (applicationFields.length > 1) {
      const newFields = applicationFields.filter((_, i) => i !== index);
      setApplicationFields(newFields);
      setValue("application", newFields);
    }
  };

  const updateApplicationField = (
    index: number,
    field: "uses" | "icon",
    value: string
  ) => {
    const newFields = [...applicationFields];
    newFields[index][field] = value;
    setApplicationFields(newFields);
    setValue("application", newFields);
  };

  const handleApplicationIconUpload = async (index: number, file: File) => {
    try {
      const iconUrl = await uploadFile(
        file,
        `applications/${Date.now()}-${file.name}`
      );
      updateApplicationField(index, "icon", iconUrl);
    } catch (error) {
      console.error("Error uploading icon:", error);
    }
  };

  const addOverviewPointField = () => {
    setOverviewPointsFields([...overviewPointsFields, {}]);
  };

  const removeOverviewPointField = (index: number) => {
    if (overviewPointsFields.length > 1) {
      const newFields = overviewPointsFields.filter((_, i) => i !== index);
      setOverviewPointsFields(newFields);
      setValue("overviewPoints", newFields);
    }
  };

  const updateOverviewPointField = (
    index: number,
    key: string,
    value: string
  ) => {
    const newFields = [...overviewPointsFields];
    newFields[index][key] = value;
    setOverviewPointsFields(newFields);
    setValue("overviewPoints", newFields);
  };

  const addOverviewPointKeyValue = (index: number) => {
    const newFields = [...overviewPointsFields];
    const existingKeys = Object.keys(newFields[index] || {});
    const newKey = `New Field ${existingKeys.length + 1}`;
    if (!newFields[index]) {
      newFields[index] = {};
    }
    newFields[index][newKey] = "";
    setOverviewPointsFields(newFields);
    setValue("overviewPoints", newFields);
  };

  const removeOverviewPointKeyValue = (index: number, keyToRemove: string) => {
    const newFields = [...overviewPointsFields];
    delete newFields[index][keyToRemove];
    setOverviewPointsFields(newFields);
    setValue("overviewPoints", newFields);
  };

  const toggleRelatedPart = (partId: string, partTitle: string) => {
    const newSelection = selectedRelatedParts.includes(partId)
      ? selectedRelatedParts.filter(id => id !== partId)
      : [...selectedRelatedParts, partId];
    
    const newSelectionNames = newSelection.map(id => {
      const part = relatedParts.find(p => p.id === id);
      return part ? part.title : '';
    }).filter(Boolean);
    
    setSelectedRelatedParts(newSelection);
    setValue("related_parts", newSelectionNames);
  };

  // Watch for category changes
  const watchedCategoryId = watch("categoryId");

  useEffect(() => {
    setSelectedCategory(watchedCategoryId);
  }, [watchedCategoryId]);

  // Define specifications for each category
  const getSpecificationFields = (categoryId: string) => {
    switch (categoryId) {
      case "foundation-drilling":
        return ["shank_size", "cutting_condition", "abrasive"];
      case "road-rehabilitation":
        return [
          "application",
          "machine_hp",
          "cutting_material",
          "cutting_condition",
        ];
      default:
        return [
          "material_number",
          "iso",
          "shank_size",
          "cutting_condition",
          "abrasive",
          "machine_hp",
          "cutting_material",
        ];
    }
  };

  const shouldShowField = (fieldName: string) => {
    if (!selectedCategory) return true; // Show all fields if no category selected
    return getSpecificationFields(selectedCategory).includes(fieldName);
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [categoriesData, relatedPartsData] = await Promise.all([
          getCategories(),
          getRelatedParts(),
        ]);
        setCategories(categoriesData);
        setRelatedParts(relatedPartsData);
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    // If editing, populate the form with existing data
    if (isEditing && productData) {
      setValue("title", productData.title);
      setValue("subtitle", productData.subtitle);
      setValue("overview", productData.overview);
      setValue("categoryId", productData.categoryId);
      setSelectedCategory(productData.categoryId); // Set selected category
      setValue("material_number", productData.material_number || "");
      setValue("cutting_conditions", productData.cutting_conditions || "");
      setValue("cutting_material", productData.cutting_material || "");
      setValue("machine_hp", productData.machine_hp || "");
      setValue("abrasive", productData.abrasive || "");
      setValue("shank_size", productData.shank_size || "");
      setValue("iso", productData.iso || "");
      setValue("cutting_condition", productData.cutting_condition || []);
      setValue("featured", productData.featured || false);
      setValue("productPrice", productData.productPrice || 0);
      setValue("related_parts", productData.related_parts || []);
      setSelectedRelatedParts(productData.related_parts || []);

      // Set application fields
      if (productData.application && productData.application.length > 0) {
        setApplicationFields(productData.application);
        setValue("application", productData.application);
      }

      // Set overview points
      if (productData.overviewPoints && productData.overviewPoints.length > 0) {
        setOverviewPointsFields(productData.overviewPoints);
        setValue("overviewPoints", productData.overviewPoints);
      }

      if (productData.images && productData.images.length > 0) {
        setValue("imageUrl1", productData.images[0] || "");
        if (productData.images.length > 1) {
          setValue("imageUrl2", productData.images[1] || "");
        }
      }
    }
  }, [isEditing, productData, setValue]);

  const onSubmit = async (data: any) => {
    setSubmitting(true);
    try {
      // Upload images if files are selected
      const uploadPromises = [];
      const imageUrls: any = {};

      if (imageFiles.product_img) {
        uploadPromises.push(
          uploadFile(
            imageFiles.product_img,
            `products/${data.title}/hero.jpg`
          ).then((url) => (imageUrls.product_img = url))
        );
      }

      if (imageFiles.overview_img) {
        uploadPromises.push(
          uploadFile(
            imageFiles.overview_img,
            `products/${data.title}/overview.jpg`
          ).then((url) => (imageUrls.overview_img = url))
        );
      }

      if (imageFiles.image_0) {
        uploadPromises.push(
          uploadFile(
            imageFiles.image_0,
            `products/${data.title}/gallery-1.jpg`
          ).then((url) => (imageUrls.image_0 = url))
        );
      }

      if (imageFiles.image_1) {
        uploadPromises.push(
          uploadFile(
            imageFiles.image_1,
            `products/${data.title}/gallery-2.jpg`
          ).then((url) => (imageUrls.image_1 = url))
        );
      }

      await Promise.all(uploadPromises);

      const productToSave = {
        ...data,
        application: applicationFields,
        overviewPoints: overviewPointsFields,
        product_img: imageUrls.product_img || productData?.product_img || "",
        overview_img: imageUrls.overview_img || productData?.overview_img || "",
        images: [
          imageUrls.image_0 || productData?.images?.[0] || "",
          imageUrls.image_1 || productData?.images?.[1] || "",
        ].filter(Boolean),
      };

      if (isEditing && productData) {
        await updateProduct(productData.id, productToSave);
      } else {
        await createProduct(productToSave);
      }

      router.push("/dashboard/products");
    } catch (error) {
      console.error("Error saving product:", error);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner size="lg" message="Loading..." />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="bg-white shadow px-4 py-5 sm:rounded-lg sm:p-6">
        <div className="md:grid md:grid-cols-3 md:gap-6">
          <div className="md:col-span-1">
            <h3 className="text-lg font-medium leading-6 text-gray-900">
              Product Information
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              Basic information about the product.
            </p>
          </div>
          <div className="mt-5 md:mt-0 md:col-span-2">
            <div className="grid grid-cols-1 sm:grid-cols-6 gap-6">
              <div className="col-span-1 sm:col-span-3">
                <label
                  htmlFor="title"
                  className="block text-sm font-medium text-gray-700"
                >
                  Product Title
                </label>
                <input
                  type="text"
                  id="title"
                  {...register("title", {
                    required: "Product title is required",
                  })}
                  className="mt-1 focus:ring-primary-500 focus:border-primary-500 block w-full shadow-sm sm:text-sm border-gray-300 py-2 px-3 border rounded-md"
                />
                {errors.title && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.title.message}
                  </p>
                )}
              </div>

              <div className="col-span-1 sm:col-span-3">
                <label
                  htmlFor="subtitle"
                  className="block text-sm font-medium text-gray-700"
                >
                  Product Subtitle
                </label>
                <input
                  type="text"
                  id="subtitle"
                  {...register("subtitle", {
                    required: "Product subtitle is required",
                  })}
                  className="mt-1 focus:ring-primary-500 focus:border-primary-500 block w-full shadow-sm sm:text-sm border-gray-300 py-2 px-3 border rounded-md"
                />
                {errors.subtitle && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.subtitle.message}
                  </p>
                )}
              </div>

              <div className="col-span-1 sm:col-span-3">
                <label
                  htmlFor="categoryId"
                  className="block text-sm font-medium text-gray-700"
                >
                  Category
                </label>
                <select
                  id="categoryId"
                  {...register("categoryId", {
                    required: "Category is required",
                  })}
                  className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                >
                  <option value="">Select a category</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.title}
                    </option>
                  ))}
                </select>
                {errors.categoryId && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.categoryId.message}
                  </p>
                )}
              </div>

              <div className="col-span-1 sm:col-span-3">
                <label
                  htmlFor="related_parts"
                  className="block text-sm font-medium text-gray-700"
                >
                  Related Parts
                </label>
                <div className="mt-1 border border-gray-300 rounded-md max-h-48 overflow-y-auto bg-white">
                  {relatedParts.map((part) => (
                    <div
                      key={part.id}
                      onClick={() => toggleRelatedPart(part.id, part.title)}
                      className={`px-3 py-2 cursor-pointer hover:bg-gray-50 border-b border-gray-100 last:border-b-0 ${
                        selectedRelatedParts.includes(part.id)
                          ? 'bg-primary-50 text-primary-700'
                          : 'text-gray-900'
                      }`}
                    >
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          checked={selectedRelatedParts.includes(part.id)}
                          onChange={() => {}} // Handled by onClick
                          className="mr-2 text-primary-600 focus:ring-primary-500"
                        />
                        {part.title}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="col-span-1 sm:col-span-6">
                <label
                  htmlFor="overview"
                  className="block text-sm font-medium text-gray-700"
                >
                  Overview
                </label>
                <CKEditor
                  editor={ClassicEditor}
                  data={productData?.overview || ""}
                  config={{
                    toolbar: [
                      "heading",
                      "|",
                      "bold",
                      "italic",
                      "link",
                      "bulletedList",
                      "numberedList",
                      "|",
                      "outdent",
                      "indent",
                      "|",
                      "blockQuote",
                      "insertTable",
                      "undo",
                      "redo",
                    ],
                  }}
                  onChange={(event, editor) => {
                    const data = editor.getData();
                    setValue("overview", data);
                  }}
                  onBlur={(event, editor) => {
                    console.log("Blur.", editor);
                  }}
                  onFocus={(event, editor) => {
                    console.log("Focus.", editor);
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white shadow px-4 py-5 sm:rounded-lg sm:p-6">
        <div className="md:grid md:grid-cols-3 md:gap-6">
          <div className="md:col-span-1">
            <h3 className="text-lg font-medium leading-6 text-gray-900">
              Specifications
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              Technical details about the product.
            </p>
          </div>
          <div className="mt-5 md:mt-0 md:col-span-2">
            <div className="grid grid-cols-1 sm:grid-cols-6 gap-6">
              {shouldShowField("material_number") && (
                <div className="col-span-1 sm:col-span-2">
                  <label
                    htmlFor="material_number"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Material Number
                  </label>
                  <input
                    type="text"
                    id="material_number"
                    {...register("material_number")}
                    className="mt-1 focus:ring-primary-500 focus:border-primary-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md py-2 px-3 border"
                  />
                </div>
              )}

              {shouldShowField("iso") && (
                <div className="col-span-1 sm:col-span-2">
                  <label
                    htmlFor="iso"
                    className="block text-sm font-medium text-gray-700"
                  >
                    ISO Catalog ID
                  </label>
                  <input
                    type="text"
                    id="iso"
                    {...register("iso")}
                    className="mt-1 focus:ring-primary-500 focus:border-primary-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md py-2 px-3 border"
                  />
                </div>
              )}

              {shouldShowField("application") &&
                selectedCategory === "road-rehabilitation" && (
                  <div className="col-span-1 sm:col-span-2">
                    <label
                      htmlFor="application_field"
                      className="block text-sm font-medium text-gray-700"
                    >
                      Application
                    </label>
                    <input
                      type="text"
                      id="application_field"
                      {...register("application_field")}
                      className="mt-1 focus:ring-primary-500 focus:border-primary-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md py-2 px-3 border"
                    />
                  </div>
                )}

              {shouldShowField("cutting_condition") && (
                <div className="col-span-1 sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Cutting Conditions
                  </label>
                  <div className="mt-2 space-y-2">
                    {["Light", "Medium", "Heavy"].map((condition) => (
                      <label
                        key={condition}
                        className="flex items-center"
                      >
                        <input
                          type="checkbox"
                          value={condition}
                          {...register("cutting_condition")}
                          className="rounded border-gray-300"
                        />
                        <span className="ml-2 text-sm text-gray-700">
                          {condition}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {shouldShowField("cutting_material") && (
                <div className="col-span-1 sm:col-span-2">
                  <label
                    htmlFor="cutting_material"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Cutting Material
                  </label>
                  <input
                    type="text"
                    id="cutting_material"
                    {...register("cutting_material")}
                    className="mt-1 focus:ring-primary-500 focus:border-primary-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md py-2 px-3 border"
                  />
                </div>
              )}

              {shouldShowField("machine_hp") && (
                <div className="col-span-1 sm:col-span-2">
                  <label
                    htmlFor="machine_hp"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Machine HP
                  </label>
                  <input
                    type="text"
                    id="machine_hp"
                    {...register("machine_hp")}
                    className="mt-1 focus:ring-primary-500 focus:border-primary-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md py-2 px-3 border"
                  />
                </div>
              )}

              {shouldShowField("abrasive") && (
                <div className="col-span-1 sm:col-span-2">
                  <label
                    htmlFor="abrasive"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Abrasive
                  </label>
                  <select
                    id="abrasive"
                    {...register("abrasive")}
                    className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                  >
                    <option value="">Select</option>
                    <option value="Yes">Yes</option>
                    <option value="No">No</option>
                  </select>
                </div>
              )}

              {shouldShowField("shank_size") && (
                <div className="col-span-1 sm:col-span-2">
                  <label
                    htmlFor="shank_size"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Shank Size
                  </label>
                  <input
                    type="text"
                    id="shank_size"
                    {...register("shank_size")}
                    className="mt-1 focus:ring-primary-500 focus:border-primary-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md py-2 px-3 border"
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white shadow px-4 py-5 sm:rounded-lg sm:p-6">
        <div className="md:grid md:grid-cols-3 md:gap-6">
          <div className="md:col-span-1">
            <h3 className="text-lg font-medium leading-6 text-gray-900">
              Applications
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              Add product applications with optional icons.
            </p>
          </div>
          <div className="mt-5 md:mt-0 md:col-span-2">
            <div className="space-y-4">
              {applicationFields.map((field, index) => (
                <div
                  key={index}
                  className="border border-gray-200 rounded-lg p-4"
                >
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="text-sm font-medium text-gray-700">
                      Application {index + 1}
                    </h4>
                    {applicationFields.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeApplicationField(index)}
                        className="text-red-600 hover:text-red-800 text-sm"
                      >
                        Remove
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Application Use
                      </label>
                      <input
                        type="text"
                        value={field.uses}
                        onChange={(e) =>
                          updateApplicationField(index, "uses", e.target.value)
                        }
                        className="mt-1 focus:ring-primary-500 focus:border-primary-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md py-2 px-3 border"
                        placeholder="e.g., Internal Retainer"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Icon
                      </label>
                      <div className="mt-1 flex items-center space-x-3">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              handleApplicationIconUpload(index, file);
                            }
                          }}
                          className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100"
                        />
                        {field.icon && (
                          <img
                            src={field.icon}
                            alt="Application icon"
                            className="h-10 w-10 object-cover rounded"
                          />
                        )}
                      </div>
                      <input
                        type="text"
                        value={field.icon}
                        onChange={(e) =>
                          updateApplicationField(index, "icon", e.target.value)
                        }
                        className="mt-2 focus:ring-primary-500 focus:border-primary-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md py-2 px-3 border"
                        placeholder="Or paste icon URL directly"
                      />
                    </div>
                  </div>
                </div>
              ))}

              <button
                type="button"
                onClick={addApplicationField}
                className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              >
                + Add Application
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white shadow px-4 py-5 sm:rounded-lg sm:p-6">
        <div className="md:grid md:grid-cols-3 md:gap-6">
          <div className="md:col-span-1">
            <h3 className="text-lg font-medium leading-6 text-gray-900">
              Overview Points
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              Add detailed specifications and technical data points.
            </p>
          </div>
          <div className="mt-5 md:mt-0 md:col-span-2">
            <div className="space-y-4">
              {overviewPointsFields.map((pointGroup, groupIndex) => (
                <div
                  key={groupIndex}
                  className="border border-gray-200 rounded-lg p-4"
                >
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="text-sm font-medium text-gray-700">
                      Overview Group {groupIndex + 1}
                    </h4>
                    {overviewPointsFields.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeOverviewPointField(groupIndex)}
                        className="text-red-600 hover:text-red-800 text-sm"
                      >
                        Remove Group
                      </button>
                    )}
                  </div>

                  <div className="space-y-3">
                    {Object.entries(pointGroup || {})
                      .filter(([key, value]) => key && key.trim() !== "")
                      .map(([key, value], keyIndex) => (
                        <div key={keyIndex} className="grid grid-cols-12 gap-2">
                          <div className="col-span-5">
                            <input
                              type="text"
                              value={key || ""}
                              onChange={(e) => {
                                const newFields = [...overviewPointsFields];
                                const oldValue = newFields[groupIndex][key];
                                delete newFields[groupIndex][key];
                                newFields[groupIndex][e.target.value] =
                                  oldValue;
                                setOverviewPointsFields(newFields);
                                setValue("overviewPoints", newFields);
                              }}
                              className="block w-full text-sm border-gray-300 rounded-md py-2 px-3 border"
                              placeholder="Field name (e.g., Material Number)"
                            />
                          </div>
                          <div className="col-span-5">
                            <input
                              type="text"
                              value={value || ""}
                              onChange={(e) =>
                                updateOverviewPointField(
                                  groupIndex,
                                  key,
                                  e.target.value
                                )
                              }
                              className="block w-full text-sm border-gray-300 rounded-md py-2 px-3 border"
                              placeholder="Field value"
                            />
                          </div>
                          <div className="col-span-2">
                            <button
                              type="button"
                              onClick={() =>
                                removeOverviewPointKeyValue(groupIndex, key)
                              }
                              className="text-red-600 hover:text-red-800 text-sm px-2 py-1"
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      ))}

                    {Object.keys(pointGroup || {}).filter(
                      (key) => key && key.trim() !== ""
                    ).length === 0 && (
                      <div className="text-sm text-gray-500 italic">
                        No fields added yet. Click "Add Field" to start.
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={() => addOverviewPointKeyValue(groupIndex)}
                      className="inline-flex items-center px-2 py-1 border border-gray-300 shadow-sm text-xs leading-4 font-medium rounded text-gray-700 bg-white hover:bg-gray-50"
                    >
                      + Add Field
                    </button>
                  </div>
                </div>
              ))}

              <button
                type="button"
                onClick={addOverviewPointField}
                className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              >
                + Add Overview Group
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white shadow px-4 py-5 sm:rounded-lg sm:p-6">
        <div className="md:grid md:grid-cols-3 md:gap-6">
          <div className="md:col-span-1">
            <h3 className="text-lg font-medium leading-6 text-gray-900">
              Additional Details
            </h3>
          </div>
          <div className="mt-5 md:mt-0 md:col-span-2">
            <div className="grid grid-cols-6 gap-6">
              <div className="col-span-6 sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700">
                  Featured Product
                </label>
                <input
                  type="checkbox"
                  {...register("featured")}
                  className="mt-2 rounded border-gray-300"
                />
              </div>
              <div className="col-span-6 sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700">
                  Product Price
                </label>
                <input
                  type="number"
                  {...register("productPrice", { valueAsNumber: true })}
                  className="mt-1 block w-full py-2 px-3 border border-gray-300 rounded-md"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white shadow px-4 py-5 sm:rounded-lg sm:p-6">
        <div className="md:grid md:grid-cols-3 md:gap-6">
          <div className="md:col-span-1">
            <h3 className="text-lg font-medium leading-6 text-gray-900">
              Images & Media
            </h3>
          </div>
          <div className="mt-5 md:mt-0 md:col-span-2">
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Product Listing Image
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) =>
                    setImageFiles({
                      ...imageFiles,
                      product_img: e.target.files?.[0] || null,
                    })
                  }
                  className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100"
                />
                {productData?.product_img && (
                  <img
                    src={productData.product_img}
                    alt="Current"
                    className="mt-2 h-20 w-20 object-cover rounded"
                  />
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Overview Image
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) =>
                    setImageFiles({
                      ...imageFiles,
                      overview_img: e.target.files?.[0] || null,
                    })
                  }
                  className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100"
                />
                {productData?.overview_img && (
                  <img
                    src={productData.overview_img}
                    alt="Current"
                    className="mt-2 h-20 w-20 object-cover rounded"
                  />
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-4">
                  Product Slider Images
                </label>
                <div className="space-y-4">
                  {[0, 1].map((index) => (
                    <div key={index}>
                      <label className="block text-sm text-gray-600 mb-2">
                        Gallery Image {index + 1}
                      </label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) =>
                          setImageFiles({
                            ...imageFiles,
                            [`image_${index}`]: e.target.files?.[0] || null,
                          })
                        }
                        className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100"
                      />
                      {productData?.images?.[index] && (
                        <img
                          src={productData.images[index]}
                          alt={`Gallery ${index + 1}`}
                          className="mt-2 h-20 w-20 object-cover rounded"
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:justify-end space-y-3 sm:space-y-0 sm:space-x-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="w-full sm:w-auto bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="w-full sm:w-auto inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
        >
          {submitting
            ? "Saving..."
            : isEditing
            ? "Update Product"
            : "Create Product"}
        </button>
      </div>
    </form>
  );
}
