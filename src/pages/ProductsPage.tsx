import React, { useState, useMemo, useRef } from 'react';
import { useApp } from '../contexts/AppContext';
import { Product, ProductCategory, ProductUnit } from '../types';
import {
  Package,
  Plus,
  Search,
  Edit2,
  Trash2,
  AlertTriangle,
  Download,
  Upload,
  Barcode,
  Image as ImageIcon,
  Check,
  X,
  FileSpreadsheet,
  Tag,
  Layers,
  Folder,
  Printer,
} from 'lucide-react';
import { NeuCard } from '../components/common/NeuCard';
import { NeuButton } from '../components/common/NeuButton';
import { NeuInput } from '../components/common/NeuInput';
import { UNCATEGORIZED_CATEGORY } from '../db/sqlite-service';
import { BarcodePrintModal } from '../components/products/BarcodePrintModal';
import { generateValidEan13, validateBarcode } from '../utils/barcodeUtils';
import * as XLSX from 'xlsx';

export const ProductsPage: React.FC = () => {
  const {
    products,
    categories,
    units,
    saveProduct,
    deleteProduct,
    saveCategory,
    deleteCategory,
    saveUnit,
    deleteUnit,
    isAdmin,
    t,
    lang,
    showToast,
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [onlyLowStock, setOnlyLowStock] = useState(false);

  // حالة نافذة إضافة/تعديل منتج
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // حالة نافذة إدارة وإنشاء التصنيفات
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryDesc, setNewCategoryDesc] = useState('');
  const [categoryError, setCategoryError] = useState('');

  // حالة نافذة إدارة وإنشاء وحدات القياس
  const [isUnitModalOpen, setIsUnitModalOpen] = useState(false);
  const [newUnitName, setNewUnitName] = useState('');
  const [newUnitAbbr, setNewUnitAbbr] = useState('');
  const [unitError, setUnitError] = useState('');

  // حالة حذف تصنيف وحذف وحدة قياس
  const [categoryToDelete, setCategoryToDelete] = useState<ProductCategory | null>(null);
  const [reassignCategoryOption, setReassignCategoryOption] = useState<'move_other' | 'uncategorized'>('move_other');
  const [targetCategoryId, setTargetCategoryId] = useState<string>('');

  const [unitToDelete, setUnitToDelete] = useState<ProductUnit | null>(null);
  const [reassignUnitOption, setReassignUnitOption] = useState<'move_other' | 'default_piece'>('move_other');
  const [targetUnitName, setTargetUnitName] = useState<string>('');

  // حالة تأكيد الحذف للمنتج
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);

  // حالة طباعة الباركود
  const [productToPrint, setProductToPrint] = useState<Product | null>(null);

  // ملف استيراد CSV
  const fileInputRef = useRef<HTMLInputElement>(null);

  // فلترة المنتجات
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchCat = selectedCategory === 'all' || p.category === selectedCategory;
      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        p.nameAr.toLowerCase().includes(q) ||
        p.nameFr.toLowerCase().includes(q) ||
        p.barcode.includes(q);
      const matchStock = !onlyLowStock || p.stock <= p.minStockAlert;

      return matchCat && matchSearch && matchStock;
    });
  }, [products, selectedCategory, searchQuery, onlyLowStock]);

  // فتح نافذة الإضافة
  const handleAddNew = () => {
    setIsEditMode(false);
    setEditingProduct({
      id: `prod_${Date.now()}`,
      barcode: '', // حقل كود الباركود / البحث يبدأ دائماً فارغاً عند فتح نافذة الإضافة
      nameAr: '',
      nameFr: '',
      category: categories[0]?.id || 'cat_grocery',
      buyPrice: 0,
      sellPrice: 0,
      stock: 10,
      minStockAlert: 5,
      unit: 'قطعة',
      imageUrl: '',
      createdAt: new Date().toISOString(),
    });
    setIsModalOpen(true);
  };

  // فتح نافذة التعديل
  const handleEdit = (p: Product) => {
    setIsEditMode(true);
    setEditingProduct({ ...p });
    setIsModalOpen(true);
  };

  // إغلاق نافذة المنتج وإعادة تعيين الحقول لضمان عدم بقاء بيانات قديمة
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingProduct(null);
    setIsEditMode(false);
  };

  // حفظ المنتج
  const handleSaveModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;
    if (!editingProduct.nameAr.trim() && !editingProduct.nameFr.trim()) {
      showToast(t.requiredField, 'error');
      return;
    }

    // إذا ترك المستخدم حقل الباركود فارغاً نولد باركود جزائري معتمد EAN-13 مع حساب رقم التحقق الصحيح
    const inputBarcode = editingProduct.barcode.trim();
    let finalBarcode = inputBarcode;

    if (!finalBarcode) {
      finalBarcode = generateValidEan13('613');
    } else {
      // التحقق من صحة الباركود المدخل لمنع حفظ أرقام غير مطابقة للمعايير
      const val = validateBarcode(finalBarcode);
      if (!val.isValid) {
        showToast(
          lang === 'ar' ? val.errorMessageAr : val.errorMessageFr,
          'error'
        );
        return;
      }
    }

    saveProduct({
      ...editingProduct,
      barcode: finalBarcode,
    });
    showToast(
      isEditMode
        ? lang === 'ar'
          ? 'تم تعديل المنتج بنجاح'
          : 'Produit modifié avec succès'
        : lang === 'ar'
        ? 'تمت إضافة المنتج بنجاح'
        : 'Produit ajouté avec succès',
      'success'
    );
    handleCloseModal();
  };

  // دوال نافذة إنشاء تصنيف جديد مباشرة من واجهة إضافة منتج
  const handleOpenCategoryModal = () => {
    setIsCategoryModalOpen(true);
    setNewCategoryName('');
    setNewCategoryDesc('');
    setCategoryError('');
  };

  const handleCloseCategoryModal = () => {
    setIsCategoryModalOpen(false);
    setNewCategoryName('');
    setNewCategoryDesc('');
    setCategoryError('');
  };

  const handleCreateCategory = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = newCategoryName.trim();
    if (!trimmedName) {
      setCategoryError(
        lang === 'ar' ? 'يرجى إدخال اسم التصنيف' : 'Veuillez saisir le nom de la catégorie'
      );
      return;
    }

    // التحقق من عدم التكرار (Validation: Prevent duplicate category names)
    const duplicate = categories.some(
      (c) =>
        c.nameAr.trim().toLowerCase() === trimmedName.toLowerCase() ||
        c.nameFr.trim().toLowerCase() === trimmedName.toLowerCase()
    );

    if (duplicate) {
      setCategoryError(
        lang === 'ar'
          ? 'هذا التصنيف موجود بالفعل، يرجى اختيار اسم آخر'
          : 'Cette catégorie existe déjà, veuillez choisir un autre nom'
      );
      return;
    }

    const newId = `cat_${Date.now()}`;
    const newCategory = {
      id: newId,
      nameAr: trimmedName,
      nameFr: trimmedName,
      description: newCategoryDesc.trim() || undefined,
      icon: 'Tag',
    };

    saveCategory(newCategory);

    // تحديد التصنيف الجديد تلقائياً للمنتج الحالي قيد الإضافة دون مغادرة الصفحة
    if (editingProduct) {
      setEditingProduct({
        ...editingProduct,
        category: newId,
      });
    }

    handleCloseCategoryModal();
  };

  // دوال نافذة إنشاء وحدة قياس جديدة مباشرة من واجهة إضافة منتج
  const handleOpenUnitModal = () => {
    setIsUnitModalOpen(true);
    setNewUnitName('');
    setNewUnitAbbr('');
    setUnitError('');
  };

  const handleCloseUnitModal = () => {
    setIsUnitModalOpen(false);
    setNewUnitName('');
    setNewUnitAbbr('');
    setUnitError('');
  };

  const handleCreateUnit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = newUnitName.trim();
    const trimmedAbbr = newUnitAbbr.trim();

    if (!trimmedName) {
      setUnitError(
        lang === 'ar' ? 'يرجى إدخال اسم وحدة القياس' : "Veuillez saisir le nom de l'unité"
      );
      return;
    }

    // التحقق الصارم من عدم التكرار (Validation: Case-insensitive check on name and abbreviation)
    const lowerName = trimmedName.toLowerCase();
    const lowerAbbr = trimmedAbbr ? trimmedAbbr.toLowerCase() : '';

    const duplicate = units.some((u) => {
      const uName = u.name.trim().toLowerCase();
      const uAbbr = u.abbreviation ? u.abbreviation.trim().toLowerCase() : '';
      return (
        uName === lowerName ||
        (lowerAbbr && uAbbr && uAbbr === lowerAbbr) ||
        (uAbbr && uAbbr === lowerName) ||
        (lowerAbbr && uName === lowerAbbr)
      );
    });

    if (duplicate) {
      setUnitError(
        lang === 'ar'
          ? 'وحدة القياس هذه موجودة بالفعل، يرجى اختيار اسم آخر'
          : 'Cette unité de mesure existe déjà, veuillez choisir un autre nom'
      );
      return;
    }

    const newUnit: ProductUnit = {
      id: `unit_${Date.now()}`,
      name: trimmedName,
      abbreviation: trimmedAbbr || undefined,
    };

    saveUnit(newUnit);

    // تحديد وحدة القياس الجديدة تلقائياً للمنتج الحالي قيد الإضافة دون مغادرة الصفحة
    if (editingProduct) {
      setEditingProduct({
        ...editingProduct,
        unit: trimmedName,
      });
    }

    handleCloseUnitModal();
  };

  // حذف منتج (مع التحقق من صلاحيات المدير)
  const handleConfirmDelete = () => {
    if (!productToDelete) return;
    if (!isAdmin) {
      showToast(t.cashierNoDeletePermission, 'error');
      setProductToDelete(null);
      return;
    }
    deleteProduct(productToDelete.id);
    setProductToDelete(null);
  };

  // معالجة طلب حذف تصنيف
  const handleRequestDeleteCategory = (cat: ProductCategory) => {
    setCategoryToDelete(cat);
    const otherCategories = categories.filter((c) => c.id !== cat.id);
    setTargetCategoryId(otherCategories[0]?.id || 'cat_uncategorized');
    setReassignCategoryOption(otherCategories.length > 0 ? 'move_other' : 'uncategorized');
  };

  // تأكيد حذف التصنيف مع معالجة المنتجات المرتبطة
  const handleConfirmDeleteCategory = () => {
    if (!categoryToDelete) return;

    const affected = products.filter((p) => p.category === categoryToDelete.id);
    let finalTargetId: string | undefined = undefined;

    if (affected.length > 0) {
      if (reassignCategoryOption === 'uncategorized') {
        const hasUncategorized = categories.some((c) => c.id === UNCATEGORIZED_CATEGORY.id);
        if (!hasUncategorized) {
          saveCategory(UNCATEGORIZED_CATEGORY);
        }
        finalTargetId = UNCATEGORIZED_CATEGORY.id;
      } else {
        finalTargetId =
          targetCategoryId ||
          categories.find((c) => c.id !== categoryToDelete.id)?.id ||
          UNCATEGORIZED_CATEGORY.id;
      }
    }

    deleteCategory(categoryToDelete.id, finalTargetId);

    if (editingProduct && editingProduct.category === categoryToDelete.id) {
      setEditingProduct({
        ...editingProduct,
        category:
          finalTargetId ||
          categories.find((c) => c.id !== categoryToDelete.id)?.id ||
          'cat_grocery',
      });
    }

    if (selectedCategory === categoryToDelete.id) {
      setSelectedCategory('all');
    }

    setCategoryToDelete(null);
    showToast(
      lang === 'ar' ? 'تم حذف التصنيف بنجاح.' : 'Category deleted successfully.',
      'success'
    );
  };

  // معالجة طلب حذف وحدة قياس
  const handleRequestDeleteUnit = (u: ProductUnit) => {
    setUnitToDelete(u);
    const otherUnits = units.filter((item) => item.id !== u.id && item.name !== u.name);
    setTargetUnitName(otherUnits[0]?.name || 'قطعة');
    setReassignUnitOption(otherUnits.length > 0 ? 'move_other' : 'default_piece');
  };

  // تأكيد حذف وحدة القياس مع إعادة تعيين وحدات المنتجات
  const handleConfirmDeleteUnit = () => {
    if (!unitToDelete) return;

    const affected = products.filter(
      (p) => p.unit === unitToDelete.name || p.unit === unitToDelete.id
    );
    let finalTargetUnit: string | undefined = undefined;

    if (affected.length > 0) {
      if (reassignUnitOption === 'default_piece') {
        finalTargetUnit = 'قطعة';
      } else {
        finalTargetUnit = targetUnitName || 'قطعة';
      }
    }

    deleteUnit(unitToDelete.id, finalTargetUnit);

    if (
      editingProduct &&
      (editingProduct.unit === unitToDelete.name || editingProduct.unit === unitToDelete.id)
    ) {
      setEditingProduct({
        ...editingProduct,
        unit: finalTargetUnit || 'قطعة',
      });
    }

    setUnitToDelete(null);
    showToast(
      lang === 'ar' ? 'تم حذف وحدة القياس بنجاح.' : 'Unit deleted successfully.',
      'success'
    );
  };

  // رفع صورة المنتج وتحويلها لـ Base64 محليًا
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && editingProduct) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setEditingProduct({
          ...editingProduct,
          imageUrl: reader.result as string,
        });
      };
      reader.readAsDataURL(file);
    }
  };

  // توليد كود باركود جزائري معتمد EAN-13 مع حساب رقم التحقق الصحيح
  const handleGenerateBarcode = () => {
    if (editingProduct) {
      const validBarcode = generateValidEan13('613');
      setEditingProduct({
        ...editingProduct,
        barcode: validBarcode,
      });
    }
  };

  // تصدير المنتجات إلى ملف Excel (.xlsx)
  const handleExportExcel = () => {
    const dataToExport = products.map((p) => ({
      'الباركود (Barcode)': p.barcode,
      'الاسم بالعربية': p.nameAr,
      'الاسم بالفرنسية': p.nameFr,
      'التصنيف': p.category,
      'سعر الشراء (د.ج)': p.buyPrice,
      'سعر البيع (د.ج)': p.sellPrice,
      'الكمية المتوفرة': p.stock,
      'حد التنبيه': p.minStockAlert,
      'الوحدة': p.unit,
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Stock');
    XLSX.writeFile(workbook, `Inventaire_DzPOS_${new Date().toISOString().split('T')[0]}.xlsx`);
    showToast('تم تصدير ملف المخزون Excel بنجاح', 'success');
  };

  // استيراد المنتجات من ملف CSV
  const handleImportCsv = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const text = evt.target?.result as string;
        const lines = text.split('\n').filter((l) => l.trim().length > 0);
        let importedCount = 0;

        // تخطي سطر العناوين والبدء من 1
        for (let i = 1; i < lines.length; i++) {
          const parts = lines[i].split(',').map((p) => p.trim().replace(/^"|"$/g, ''));
          if (parts.length >= 4) {
            const barcode = parts[0] || generateValidEan13('613');
            const nameAr = parts[1] || 'منتج مستورد';
            const buyPrice = parseFloat(parts[2]) || 0;
            const sellPrice = parseFloat(parts[3]) || 0;
            const stock = parseFloat(parts[4]) || 10;

            saveProduct({
              id: `prod_imp_${Date.now()}_${i}`,
              barcode,
              nameAr,
              nameFr: nameAr,
              category: 'cat_grocery',
              buyPrice,
              sellPrice,
              stock,
              minStockAlert: 5,
              unit: 'قطعة',
              createdAt: new Date().toISOString(),
            });
            importedCount++;
          }
        }
        showToast(`تم استيراد ${importedCount} منتج بنجاح`, 'success');
      } catch (err) {
        showToast('خطأ أثناء قراءة ملف CSV', 'error');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-5">
      {/* شريط الأدوات العلوي: بحث، تصفيات، وأزرار إضافة وتصدير */}
      <div className="neu-flat p-4 rounded-3xl flex flex-col md:flex-row items-center justify-between gap-4">
        {/* حقل البحث والتصفية السريعة */}
        <div className="flex flex-1 items-center gap-3 w-full">
          <div className="flex-1">
            <NeuInput
              placeholder={t.search}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              icon={<Search className="w-4 h-4" />}
            />
          </div>

          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="neu-input rounded-xl py-2 px-3 text-xs font-bold text-slate-700 bg-white/70 appearance-none cursor-pointer"
          >
            <option value="all">{t.allCategories}</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {lang === 'ar' ? c.nameAr : c.nameFr}
              </option>
            ))}
          </select>

          <button
            onClick={() => setOnlyLowStock(!onlyLowStock)}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
              onlyLowStock
                ? 'neu-pressed text-rose-600 bg-rose-50'
                : 'neu-raised text-slate-600 hover:text-slate-900'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>نواقص المخزون</span>
          </button>
        </div>

        {/* أزرار الإجراءات: التصنيفات، الوحدات، إضافة، تصدير، واستيراد */}
        <div className="flex items-center gap-2 flex-wrap w-full md:w-auto justify-end">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImportCsv}
            accept=".csv"
            className="hidden"
          />

          <NeuButton
            size="sm"
            onClick={handleOpenCategoryModal}
            icon={<Tag className="w-3.5 h-3.5 text-indigo-600" />}
            title={lang === 'ar' ? 'إدارة وتصنيف المنتجات وحذفها' : 'Gérer les catégories'}
          >
            <span>{lang === 'ar' ? 'التصنيفات' : 'Catégories'}</span>
          </NeuButton>

          <NeuButton
            size="sm"
            onClick={handleOpenUnitModal}
            icon={<Layers className="w-3.5 h-3.5 text-purple-600" />}
            title={lang === 'ar' ? 'إدارة وحدات القياس وحذفها' : 'Gérer les unités'}
          >
            <span>{lang === 'ar' ? 'الوحدات' : 'Unités'}</span>
          </NeuButton>

          <NeuButton
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            icon={<Upload className="w-3.5 h-3.5 text-blue-600" />}
            title="استيراد منتجات من ملف CSV"
          >
            <span>{t.importCsv}</span>
          </NeuButton>

          <NeuButton
            size="sm"
            onClick={handleExportExcel}
            icon={<FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />}
          >
            <span>{t.exportExcel}</span>
          </NeuButton>

          <NeuButton
            variant="primary"
            size="sm"
            onClick={handleAddNew}
            icon={<Plus className="w-4 h-4" />}
          >
            <span>{t.add}</span>
          </NeuButton>
        </div>
      </div>

      {/* جدول المنتجات المعروضة */}
      <NeuCard className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-start">
            <thead className="bg-slate-200/50 text-slate-500 uppercase font-bold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4 text-start">المنتج</th>
                <th className="py-3 px-4 text-start">الباركود</th>
                <th className="py-3 px-4 text-start">التصنيف</th>
                <th className="py-3 px-4 text-end">سعر الشراء</th>
                <th className="py-3 px-4 text-end">سعر البيع</th>
                <th className="py-3 px-4 text-end">الربح</th>
                <th className="py-3 px-4 text-center">المخزون</th>
                <th className="py-3 px-4 text-center">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400 font-semibold">
                    لا توجد منتجات مطابقة في المخزون
                  </td>
                </tr>
              ) : (
                filteredProducts.map((p) => {
                  const profit = p.sellPrice - p.buyPrice;
                  const isLow = p.stock <= p.minStockAlert;

                  return (
                    <tr key={p.id} className="hover:bg-blue-50/30 transition-colors">
                      <td className="py-3 px-4 font-bold text-slate-800">
                        <div className="flex items-center gap-2.5">
                          {p.imageUrl ? (
                            <img
                              src={p.imageUrl}
                              alt={p.nameAr}
                              className="w-8 h-8 rounded-lg object-cover neu-inset"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-lg neu-inset flex items-center justify-center text-slate-400">
                              <Package className="w-4 h-4" />
                            </div>
                          )}
                          <div>
                            <div className="line-clamp-1">{p.nameAr}</div>
                            <div className="text-[10px] text-slate-400 font-normal line-clamp-1">
                              {p.nameFr}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-4 font-mono text-slate-600 tabular-nums">
                        {p.barcode}
                      </td>

                      <td className="py-3 px-4 text-slate-600">
                        {categories.find((c) => c.id === p.category)?.nameAr || p.category}
                      </td>

                      <td className="py-3 px-4 text-end font-semibold text-slate-600 tabular-nums">
                        {p.buyPrice.toLocaleString()} {t.currency}
                      </td>

                      <td className="py-3 px-4 text-end font-extrabold text-blue-700 tabular-nums">
                        {p.sellPrice.toLocaleString()} {t.currency}
                      </td>

                      <td className="py-3 px-4 text-end font-bold text-emerald-600 tabular-nums">
                        +{profit.toLocaleString()} {t.currency}
                      </td>

                      <td className="py-3 px-4 text-center">
                        <span
                          className={`px-2.5 py-1 rounded-xl text-[11px] font-bold inline-flex items-center gap-1 ${
                            isLow
                              ? 'bg-rose-50 text-rose-600 border border-rose-200'
                              : 'neu-inset text-slate-700'
                          }`}
                        >
                          {isLow && <AlertTriangle className="w-3 h-3 text-rose-500" />}
                          <span>
                            {p.stock} {p.unit}
                          </span>
                        </span>
                      </td>

                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => setProductToPrint(p)}
                            className="p-1.5 rounded-lg neu-raised text-slate-600 hover:text-green-600 transition-colors"
                            title={lang === 'ar' ? 'طباعة الباركود' : 'Imprimer code-barres'}
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => handleEdit(p)}
                            className="p-1.5 rounded-lg neu-raised text-slate-600 hover:text-blue-600 transition-colors"
                            title={t.edit}
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          {isAdmin && (
                            <button
                              onClick={() => setProductToDelete(p)}
                              className="p-1.5 rounded-lg neu-raised text-slate-600 hover:text-rose-600 transition-colors"
                              title={t.delete}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </NeuCard>

      {/* نافذة إضافة أو تعديل منتج Modal */}
      {isModalOpen && editingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
          <div className="neu-flat rounded-3xl p-6 w-full max-w-lg bg-white my-8 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200">
              <h3 className="font-extrabold text-base text-slate-800">
                {isEditMode ? t.edit : (lang === 'ar' ? 'إضافة منتج جديد' : t.add)}
              </h3>
              <button
                type="button"
                onClick={handleCloseModal}
                className="w-8 h-8 rounded-xl neu-raised flex items-center justify-center text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveModal} className="mt-4 space-y-4">
              {/* الباركود وتوليد تلقائي */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1 px-1">
                  {t.productBarcode}
                </label>
                <div className="flex items-center gap-2">
                  <NeuInput
                    value={editingProduct.barcode}
                    onChange={(e) =>
                      setEditingProduct({ ...editingProduct, barcode: e.target.value })
                    }
                    placeholder={
                      lang === 'ar'
                        ? 'أدخل كود الباركود...'
                        : 'Saisir le code-barres...'
                    }
                    className="font-mono text-xs"
                    autoFocus
                  />
                  <NeuButton
                    type="button"
                    size="sm"
                    onClick={handleGenerateBarcode}
                    icon={<Barcode className="w-3.5 h-3.5" />}
                    title={t.generateBarcode}
                  >
                    توليد EAN-13
                  </NeuButton>
                </div>
                {/* تنبيه فوري إذا كان الباركود المدخل غير صالح */}
                {(() => {
                  const bc = editingProduct.barcode.trim();
                  if (!bc) return null;
                  const res = validateBarcode(bc);
                  if (res.isValid) return null;
                  return (
                    <div className="mt-1.5 p-2 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-between text-[11px] text-rose-700 animate-in fade-in">
                      <div className="flex items-center gap-1.5 overflow-hidden">
                        <AlertTriangle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                        <span className="truncate">
                          {lang === 'ar' ? res.errorMessageAr : res.errorMessageFr}
                        </span>
                      </div>
                      {res.suggestedCorrection && (
                        <button
                          type="button"
                          onClick={() =>
                            setEditingProduct({
                              ...editingProduct,
                              barcode: res.suggestedCorrection!,
                            })
                          }
                          className="px-2 py-0.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] shrink-0 transition-colors ml-2 cursor-pointer"
                        >
                          {lang === 'ar' ? 'تصحيح تلقائي' : 'Corriger'}
                        </button>
                      )}
                    </div>
                  );
                })()}
              </div>

              {/* الاسم بالعربية والفرنسية */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <NeuInput
                  label={t.productNameAr}
                  required
                  value={editingProduct.nameAr}
                  onChange={(e) =>
                    setEditingProduct({ ...editingProduct, nameAr: e.target.value })
                  }
                  placeholder="مثال: حليب كانديا 1 لتر"
                />
                <NeuInput
                  label={t.productNameFr}
                  value={editingProduct.nameFr}
                  onChange={(e) =>
                    setEditingProduct({ ...editingProduct, nameFr: e.target.value })
                  }
                  placeholder="Ex: Lait Candia 1L"
                />
              </div>

              {/* التصنيف ووحدة القياس */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1 px-1">
                    <label className="block text-xs font-semibold text-slate-600">
                      {t.productCategory}
                    </label>
                    <button
                      type="button"
                      onClick={handleOpenCategoryModal}
                      className="text-[11px] font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer"
                    >
                      <Tag className="w-3 h-3" />
                      <span>{lang === 'ar' ? 'إدارة وحذف التصنيفات' : 'Gérer les catégories'}</span>
                    </button>
                  </div>
                  <select
                    value={editingProduct.category}
                    onChange={(e) => {
                      if (e.target.value === '__MANAGE_CATEGORIES__') {
                        handleOpenCategoryModal();
                      } else {
                        setEditingProduct({ ...editingProduct, category: e.target.value });
                      }
                    }}
                    className="neu-input w-full rounded-xl py-2.5 px-3 text-xs font-bold text-slate-700 bg-white/70"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {lang === 'ar' ? c.nameAr : c.nameFr}
                      </option>
                    ))}
                    <option value="__MANAGE_CATEGORIES__" className="text-blue-600 font-bold bg-blue-50/80">
                      ⚙️ {lang === 'ar' ? 'إدارة وحذف وإضافة التصنيفات...' : 'Gérer les catégories...'}
                    </option>
                  </select>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1 px-1">
                    <label className="block text-xs font-semibold text-slate-600">
                      {t.unit}
                    </label>
                    <button
                      type="button"
                      onClick={handleOpenUnitModal}
                      className="text-[11px] font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer"
                    >
                      <Layers className="w-3 h-3" />
                      <span>{lang === 'ar' ? 'إدارة وحذف الوحدات' : 'Gérer les unités'}</span>
                    </button>
                  </div>
                  <select
                    value={editingProduct.unit}
                    onChange={(e) => {
                      if (e.target.value === '__MANAGE_UNITS__') {
                        handleOpenUnitModal();
                      } else {
                        setEditingProduct({ ...editingProduct, unit: e.target.value });
                      }
                    }}
                    className="neu-input w-full rounded-xl py-2.5 px-3 text-xs font-bold text-slate-700 bg-white/70"
                  >
                    {units.map((u) => (
                      <option key={u.id} value={u.name}>
                        {u.name} {u.abbreviation ? `(${u.abbreviation})` : ''}
                      </option>
                    ))}
                    <option value="__MANAGE_UNITS__" className="text-blue-600 font-bold bg-blue-50/80">
                      ⚙️ {lang === 'ar' ? 'إدارة وحذف وإضافة وحدات القياس...' : 'Gérer les unités...'}
                    </option>
                  </select>
                </div>
              </div>

              {/* الأسعار والهامش الربحي */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <NeuInput
                  label={t.buyPrice}
                  type="number"
                  required
                  value={editingProduct.buyPrice}
                  onChange={(e) =>
                    setEditingProduct({
                      ...editingProduct,
                      buyPrice: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="tabular-nums"
                />
                <NeuInput
                  label={t.sellPrice}
                  type="number"
                  required
                  value={editingProduct.sellPrice}
                  onChange={(e) =>
                    setEditingProduct({
                      ...editingProduct,
                      sellPrice: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="tabular-nums font-bold text-blue-600"
                />
              </div>

              {/* الكمية وحد التنبيه */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <NeuInput
                  label={t.stockQuantity}
                  type="number"
                  required
                  value={editingProduct.stock}
                  onChange={(e) =>
                    setEditingProduct({
                      ...editingProduct,
                      stock: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="tabular-nums"
                />
                <NeuInput
                  label={t.minStockAlert}
                  type="number"
                  required
                  value={editingProduct.minStockAlert}
                  onChange={(e) =>
                    setEditingProduct({
                      ...editingProduct,
                      minStockAlert: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="tabular-nums"
                />
              </div>

              {/* صورة المنتج */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1 px-1">
                  {t.productImage}
                </label>
                <div className="flex items-center gap-3">
                  {editingProduct.imageUrl ? (
                    <img
                      src={editingProduct.imageUrl}
                      alt="Product"
                      className="w-12 h-12 rounded-xl object-cover neu-inset"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-xl neu-inset flex items-center justify-center text-slate-300">
                      <ImageIcon className="w-6 h-6" />
                    </div>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="text-xs text-slate-500 file:neu-raised file:rounded-xl file:px-3 file:py-1.5 file:border-0 file:text-xs file:font-bold file:text-slate-700 cursor-pointer"
                  />
                </div>
              </div>

              {/* أزرار الحفظ والإلغاء */}
              <div className="flex items-center gap-3 pt-3 border-t border-slate-200">
                <NeuButton type="submit" variant="primary" fullWidth>
                  {t.save}
                </NeuButton>
                <NeuButton
                  type="button"
                  variant="default"
                  onClick={handleCloseModal}
                >
                  {t.cancel}
                </NeuButton>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* نافذة إدارة وتصنيف المنتجات */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-150 overflow-y-auto">
          <div className="neu-flat rounded-3xl p-6 w-full max-w-lg bg-white shadow-2xl border border-white/80 animate-in zoom-in-95 duration-150 my-8">
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center neu-inset">
                  <Tag className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-extrabold text-sm text-slate-900">
                    {lang === 'ar' ? 'إدارة وتصنيف المنتجات' : 'Gestion des Catégories'}
                  </h4>
                  <p className="text-[10px] text-slate-400">
                    {lang === 'ar' ? 'عرض وحذف وإضافة تصنيفات المحل' : 'Gérer, supprimer et créer les catégories'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleCloseCategoryModal}
                className="w-7 h-7 rounded-lg neu-raised flex items-center justify-center text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* قائمة التصنيفات الحالية مع زر الحذف */}
            <div className="mt-4">
              <div className="flex items-center justify-between mb-2 px-1">
                <span className="text-xs font-bold text-slate-700">
                  {lang === 'ar' ? 'التصنيفات الحالية :' : 'Catégories existantes :'}
                </span>
                <span className="text-[11px] font-semibold text-slate-400">
                  {categories.length} {lang === 'ar' ? 'تصنيف' : 'catégories'}
                </span>
              </div>

              <div className="max-h-48 overflow-y-auto space-y-2 pe-1 border border-slate-100 rounded-2xl p-2 bg-slate-50/50">
                {categories.length === 0 ? (
                  <p className="text-center text-slate-400 text-xs py-3">
                    {lang === 'ar' ? 'لا توجد تصنيفات حالياً' : 'Aucune catégorie'}
                  </p>
                ) : (
                  categories.map((c) => {
                    const count = products.filter((p) => p.category === c.id).length;
                    return (
                      <div
                        key={c.id}
                        className="flex items-center justify-between p-2 rounded-xl bg-white border border-slate-200/70 hover:border-slate-300 transition-all text-xs"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-6 h-6 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                            <Tag className="w-3 h-3" />
                          </div>
                          <div className="min-w-0">
                            <div className="font-bold text-slate-800 truncate">
                              {c.nameAr}
                            </div>
                            {c.nameFr && c.nameFr !== c.nameAr && (
                              <div className="text-[10px] text-slate-400 truncate">
                                {c.nameFr}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              count > 0
                                ? 'bg-blue-50 text-blue-700 border border-blue-200/60'
                                : 'bg-slate-100 text-slate-500'
                            }`}
                          >
                            {count}{' '}
                            {lang === 'ar'
                              ? count === 1
                                ? 'منتج'
                                : 'منتجات'
                              : count === 1
                              ? 'produit'
                              : 'produits'}
                          </span>

                          <button
                            type="button"
                            onClick={() => handleRequestDeleteCategory(c)}
                            className="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition-all cursor-pointer"
                            title={lang === 'ar' ? 'حذف هذا التصنيف' : 'Supprimer cette catégorie'}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* قسم إضافة تصنيف جديد */}
            <form onSubmit={handleCreateCategory} className="mt-5 pt-4 border-t border-slate-100 space-y-3.5">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 mb-1">
                <Plus className="w-3.5 h-3.5 text-blue-600" />
                <span>{lang === 'ar' ? 'إضافة تصنيف جديد' : 'Créer une nouvelle catégorie'}</span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 px-0.5">
                  {lang === 'ar' ? 'اسم التصنيف *' : 'Nom de la catégorie *'}
                </label>
                <NeuInput
                  value={newCategoryName}
                  onChange={(e) => {
                    setNewCategoryName(e.target.value);
                    if (categoryError) setCategoryError('');
                  }}
                  placeholder={lang === 'ar' ? 'مثال: بهارات وتوابل' : 'Ex: Épices & Condiments'}
                  required
                  className="text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 px-0.5">
                  {lang === 'ar' ? 'وصف التصنيف (اختياري)' : 'Description (Optionnel)'}
                </label>
                <textarea
                  value={newCategoryDesc}
                  onChange={(e) => setNewCategoryDesc(e.target.value)}
                  placeholder={lang === 'ar' ? 'وصف مختصر للتصنيف...' : 'Description brève...'}
                  rows={2}
                  className="neu-input w-full rounded-xl py-2 px-3 text-xs text-slate-700 bg-white/70 resize-none outline-none focus:border-blue-500"
                />
              </div>

              {categoryError && (
                <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-600 font-bold flex items-center gap-1.5 animate-in fade-in">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500" />
                  <span>{categoryError}</span>
                </div>
              )}

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <NeuButton
                  type="button"
                  variant="default"
                  size="sm"
                  onClick={handleCloseCategoryModal}
                >
                  {lang === 'ar' ? 'إغلاق' : 'Fermer'}
                </NeuButton>
                <NeuButton
                  type="submit"
                  variant="primary"
                  size="sm"
                  icon={<Check className="w-3.5 h-3.5" />}
                >
                  {lang === 'ar' ? 'إنشاء التصنيف' : 'Créer la catégorie'}
                </NeuButton>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* نافذة إدارة وحدات القياس */}
      {isUnitModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-150 overflow-y-auto">
          <div className="neu-flat rounded-3xl p-6 w-full max-w-lg bg-white shadow-2xl border border-white/80 animate-in zoom-in-95 duration-150 my-8">
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center neu-inset">
                  <Layers className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-extrabold text-sm text-slate-900">
                    {lang === 'ar' ? 'إدارة وحدات القياس' : 'Gestion des Unités de Mesure'}
                  </h4>
                  <p className="text-[10px] text-slate-400">
                    {lang === 'ar' ? 'عرض وحذف وإضافة وحدات القياس' : 'Gérer, supprimer et créer les unités'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleCloseUnitModal}
                className="w-7 h-7 rounded-lg neu-raised flex items-center justify-center text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* قائمة وحدات القياس الحالية مع زر الحذف */}
            <div className="mt-4">
              <div className="flex items-center justify-between mb-2 px-1">
                <span className="text-xs font-bold text-slate-700">
                  {lang === 'ar' ? 'وحدات القياس الحالية :' : 'Unités existantes :'}
                </span>
                <span className="text-[11px] font-semibold text-slate-400">
                  {units.length} {lang === 'ar' ? 'وحدة' : 'unités'}
                </span>
              </div>

              <div className="max-h-48 overflow-y-auto space-y-2 pe-1 border border-slate-100 rounded-2xl p-2 bg-slate-50/50">
                {units.length === 0 ? (
                  <p className="text-center text-slate-400 text-xs py-3">
                    {lang === 'ar' ? 'لا توجد وحدات قياس حالياً' : 'Aucune unité'}
                  </p>
                ) : (
                  units.map((u) => {
                    const count = products.filter(
                      (p) => p.unit === u.name || p.unit === u.id
                    ).length;
                    return (
                      <div
                        key={u.id}
                        className="flex items-center justify-between p-2 rounded-xl bg-white border border-slate-200/70 hover:border-slate-300 transition-all text-xs"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-6 h-6 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                            <Layers className="w-3 h-3" />
                          </div>
                          <div className="min-w-0">
                            <span className="font-bold text-slate-800">
                              {u.name}
                            </span>
                            {u.abbreviation && (
                              <span className="text-[10px] text-slate-400 font-mono ms-1.5 px-1 py-0.5 rounded bg-slate-100 border border-slate-200">
                                {u.abbreviation}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              count > 0
                                ? 'bg-purple-50 text-purple-700 border border-purple-200/60'
                                : 'bg-slate-100 text-slate-500'
                            }`}
                          >
                            {count}{' '}
                            {lang === 'ar'
                              ? count === 1
                                ? 'منتج'
                                : 'منتجات'
                              : count === 1
                              ? 'produit'
                              : 'produits'}
                          </span>

                          <button
                            type="button"
                            onClick={() => handleRequestDeleteUnit(u)}
                            className="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition-all cursor-pointer"
                            title={lang === 'ar' ? 'حذف هذه الوحدة' : 'Supprimer cette unité'}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* قسم إضافة وحدة قياس جديدة */}
            <form onSubmit={handleCreateUnit} className="mt-5 pt-4 border-t border-slate-100 space-y-3.5">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 mb-1">
                <Plus className="w-3.5 h-3.5 text-purple-600" />
                <span>{lang === 'ar' ? 'إضافة وحدة قياس جديدة' : 'Créer une nouvelle unité'}</span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 px-0.5">
                  {lang === 'ar' ? 'اسم وحدة القياس *' : "Nom de l'unité *"}
                </label>
                <NeuInput
                  value={newUnitName}
                  onChange={(e) => {
                    setNewUnitName(e.target.value);
                    if (unitError) setUnitError('');
                  }}
                  placeholder={lang === 'ar' ? 'مثال: Box أو كرتونة أو حبة أو متر' : 'Ex: Box, Carton, Roll'}
                  required
                  className="text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 px-0.5">
                  {lang === 'ar' ? 'الرمز / الاختصار (اختياري)' : 'Abréviation / Symbole (Optionnel)'}
                </label>
                <NeuInput
                  value={newUnitAbbr}
                  onChange={(e) => {
                    setNewUnitAbbr(e.target.value);
                    if (unitError) setUnitError('');
                  }}
                  placeholder={lang === 'ar' ? 'مثال: BX أو CTN أو PK أو BT' : 'Ex: BX, CTN, PK, BT'}
                  className="text-xs font-mono uppercase"
                />
              </div>

              {unitError && (
                <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-600 font-bold flex items-center gap-1.5 animate-in fade-in">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500" />
                  <span>{unitError}</span>
                </div>
              )}

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <NeuButton
                  type="button"
                  variant="default"
                  size="sm"
                  onClick={handleCloseUnitModal}
                >
                  {lang === 'ar' ? 'إغلاق' : 'Fermer'}
                </NeuButton>
                <NeuButton
                  type="submit"
                  variant="primary"
                  size="sm"
                  icon={<Check className="w-3.5 h-3.5" />}
                >
                  {lang === 'ar' ? 'إنشاء وحدة القياس' : "Créer l'unité"}
                </NeuButton>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* نافذة تأكيد وتحذير حذف تصنيف */}
      {categoryToDelete && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="neu-flat rounded-3xl p-6 w-full max-w-md bg-white shadow-2xl border border-white/80 animate-in zoom-in-95 duration-150">
            {products.filter((p) => p.category === categoryToDelete.id).length === 0 ? (
              <div className="text-center">
                <div className="w-12 h-12 rounded-2xl neu-inset mx-auto flex items-center justify-center text-rose-500 mb-3 bg-rose-50/50">
                  <Trash2 className="w-6 h-6" />
                </div>
                <h4 className="font-extrabold text-base text-slate-800 mb-1.5">
                  {lang === 'ar' ? 'تأكيد حذف التصنيف' : 'Confirmer la suppression'}
                </h4>
                <p className="text-xs text-slate-600 mb-2 font-medium">
                  {lang === 'ar'
                    ? 'هل أنت متأكد من حذف هذا التصنيف؟'
                    : 'Are you sure you want to delete this category?'}
                </p>
                <div className="neu-inset px-3 py-2 rounded-xl text-xs font-bold text-slate-800 bg-slate-50 mb-4 inline-block">
                  {categoryToDelete.nameAr} {categoryToDelete.nameFr !== categoryToDelete.nameAr ? `(${categoryToDelete.nameFr})` : ''}
                </div>
                <p className="text-[11px] text-slate-400 mb-5">
                  {lang === 'ar'
                    ? 'لا توجد منتجات مرتبطة بهذا التصنيف حالياً.'
                    : "Aucun produit n'est associé à cette catégorie."}
                </p>
                <div className="flex items-center gap-2.5">
                  <NeuButton
                    variant="danger"
                    fullWidth
                    onClick={handleConfirmDeleteCategory}
                  >
                    {lang === 'ar' ? 'نعم، احذف التصنيف' : 'Oui, supprimer'}
                  </NeuButton>
                  <NeuButton
                    variant="default"
                    fullWidth
                    onClick={() => setCategoryToDelete(null)}
                  >
                    {lang === 'ar' ? 'إلغاء' : 'Annuler'}
                  </NeuButton>
                </div>
              </div>
            ) : (
              <div>
                <div className="flex items-start gap-3 pb-3 border-b border-slate-100">
                  <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center neu-inset shrink-0 mt-0.5">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-sm text-slate-900">
                      {lang === 'ar' ? 'التصنيف مستخدم في منتجات' : 'Catégorie utilisée par des produits'}
                    </h4>
                    <p className="text-xs text-slate-500 font-medium mt-0.5">
                      {lang === 'ar'
                        ? 'هذا التصنيف مستخدم حالياً بواسطة منتجات. اختر الإجراء المناسب لهذه المنتجات قبل حذف التصنيف.'
                        : 'This category is currently used by products. Choose what to do with these products before deleting the category.'}
                    </p>
                  </div>
                </div>

                <div className="my-4 p-3 rounded-2xl bg-amber-50/70 border border-amber-200/80 text-xs">
                  <div className="flex items-center justify-between text-amber-900 font-bold mb-1">
                    <span>{categoryToDelete.nameAr}</span>
                    <span className="px-2 py-0.5 rounded-full bg-amber-200/80 text-amber-900 text-[10px]">
                      {products.filter((p) => p.category === categoryToDelete.id).length}{' '}
                      {lang === 'ar' ? 'منتج مرتبط' : 'produits liés'}
                    </span>
                  </div>
                  <p className="text-[11px] text-amber-800/90 font-medium">
                    {lang === 'ar'
                      ? 'ملاحظة أمان: لن يتم حذف المنتجات نهائياً. سيتم نقلها بأمان إلى الخيار المحدد أدناه.'
                      : 'Sécurité : les produits ne seront jamais supprimés, ils seront réaffectés.'}
                  </p>
                </div>

                {/* خيارات النقل */}
                <div className="space-y-2.5 mb-5 text-xs">
                  {categories.filter((c) => c.id !== categoryToDelete.id).length > 0 && (
                    <label
                      onClick={() => setReassignCategoryOption('move_other')}
                      className={`block p-3 rounded-2xl border cursor-pointer transition-all ${
                        reassignCategoryOption === 'move_other'
                          ? 'border-blue-500 bg-blue-50/60 shadow-sm'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <input
                          type="radio"
                          name="cat_reassign"
                          checked={reassignCategoryOption === 'move_other'}
                          onChange={() => setReassignCategoryOption('move_other')}
                          className="accent-blue-600"
                        />
                        <span className="font-bold text-slate-800">
                          {lang === 'ar'
                            ? 'نقل المنتجات إلى تصنيف آخر موجود'
                            : 'Déplacer vers une autre catégorie existante'}
                        </span>
                      </div>
                      {reassignCategoryOption === 'move_other' && (
                        <select
                          value={targetCategoryId}
                          onChange={(e) => setTargetCategoryId(e.target.value)}
                          className="neu-input w-full rounded-xl py-2 px-3 text-xs font-bold text-slate-700 bg-white mt-1.5"
                        >
                          {categories
                            .filter((c) => c.id !== categoryToDelete.id)
                            .map((c) => (
                              <option key={c.id} value={c.id}>
                                {lang === 'ar' ? c.nameAr : c.nameFr}
                              </option>
                            ))}
                        </select>
                      )}
                    </label>
                  )}

                  <label
                    onClick={() => setReassignCategoryOption('uncategorized')}
                    className={`block p-3 rounded-2xl border cursor-pointer transition-all ${
                      reassignCategoryOption === 'uncategorized'
                        ? 'border-blue-500 bg-blue-50/60 shadow-sm'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="cat_reassign"
                        checked={reassignCategoryOption === 'uncategorized'}
                        onChange={() => setReassignCategoryOption('uncategorized')}
                        className="accent-blue-600"
                      />
                      <div className="flex items-center gap-1.5 font-bold text-slate-800">
                        <Folder className="w-3.5 h-3.5 text-slate-500" />
                        <span>
                          {lang === 'ar'
                            ? 'نقل المنتجات إلى "غير مصنف" (Uncategorized)'
                            : 'Déplacer vers "Non catégorisé" (Uncategorized)'}
                        </span>
                      </div>
                    </div>
                  </label>
                </div>

                <div className="flex items-center gap-2.5 pt-3 border-t border-slate-100">
                  <NeuButton
                    variant="danger"
                    fullWidth
                    onClick={handleConfirmDeleteCategory}
                  >
                    {lang === 'ar' ? 'تأكيد النقل وحذف التصنيف' : 'Transférer et supprimer'}
                  </NeuButton>
                  <NeuButton
                    variant="default"
                    fullWidth
                    onClick={() => setCategoryToDelete(null)}
                  >
                    {lang === 'ar' ? 'إلغاء' : 'Annuler'}
                  </NeuButton>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* نافذة تأكيد وتحذير حذف وحدة قياس */}
      {unitToDelete && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="neu-flat rounded-3xl p-6 w-full max-w-md bg-white shadow-2xl border border-white/80 animate-in zoom-in-95 duration-150">
            {products.filter((p) => p.unit === unitToDelete.name || p.unit === unitToDelete.id).length === 0 ? (
              <div className="text-center">
                <div className="w-12 h-12 rounded-2xl neu-inset mx-auto flex items-center justify-center text-rose-500 mb-3 bg-rose-50/50">
                  <Trash2 className="w-6 h-6" />
                </div>
                <h4 className="font-extrabold text-base text-slate-800 mb-1.5">
                  {lang === 'ar' ? 'تأكيد حذف وحدة القياس' : "Confirmer la suppression de l'unité"}
                </h4>
                <p className="text-xs text-slate-600 mb-2 font-medium">
                  {lang === 'ar'
                    ? 'هل أنت متأكد من حذف وحدة القياس هذه؟'
                    : 'Are you sure you want to delete this unit?'}
                </p>
                <div className="neu-inset px-3 py-2 rounded-xl text-xs font-bold text-slate-800 bg-slate-50 mb-4 inline-block">
                  {unitToDelete.name} {unitToDelete.abbreviation ? `(${unitToDelete.abbreviation})` : ''}
                </div>
                <p className="text-[11px] text-slate-400 mb-5">
                  {lang === 'ar'
                    ? 'لا توجد منتجات مرتبطة بهذه الوحدة حالياً.'
                    : "Aucun produit n'utilise cette unité."}
                </p>
                <div className="flex items-center gap-2.5">
                  <NeuButton
                    variant="danger"
                    fullWidth
                    onClick={handleConfirmDeleteUnit}
                  >
                    {lang === 'ar' ? 'نعم، احذف الوحدة' : 'Oui, supprimer'}
                  </NeuButton>
                  <NeuButton
                    variant="default"
                    fullWidth
                    onClick={() => setUnitToDelete(null)}
                  >
                    {lang === 'ar' ? 'إلغاء' : 'Annuler'}
                  </NeuButton>
                </div>
              </div>
            ) : (
              <div>
                <div className="flex items-start gap-3 pb-3 border-b border-slate-100">
                  <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center neu-inset shrink-0 mt-0.5">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-sm text-slate-900">
                      {lang === 'ar' ? 'وحدة القياس مستخدمة في منتجات' : 'Unité utilisée par des produits'}
                    </h4>
                    <p className="text-xs text-slate-500 font-medium mt-0.5">
                      {lang === 'ar'
                        ? 'وحدة القياس هذه مستخدمة حالياً بواسطة منتجات. اختر الإجراء المناسب لهذه المنتجات قبل حذف وحدة القياس.'
                        : 'This unit is currently used by products. Choose what to do with these products before deleting the unit.'}
                    </p>
                  </div>
                </div>

                <div className="my-4 p-3 rounded-2xl bg-amber-50/70 border border-amber-200/80 text-xs">
                  <div className="flex items-center justify-between text-amber-900 font-bold mb-1">
                    <span>{unitToDelete.name} {unitToDelete.abbreviation ? `(${unitToDelete.abbreviation})` : ''}</span>
                    <span className="px-2 py-0.5 rounded-full bg-amber-200/80 text-amber-900 text-[10px]">
                      {products.filter((p) => p.unit === unitToDelete.name || p.unit === unitToDelete.id).length}{' '}
                      {lang === 'ar' ? 'منتج مرتبط' : 'produits liés'}
                    </span>
                  </div>
                  <p className="text-[11px] text-amber-800/90 font-medium">
                    {lang === 'ar'
                      ? 'ملاحظة أمان: لن يتم حذف المنتجات نهائياً. سيتم إعادة تعيين وحدات قياسها بأمان.'
                      : 'Sécurité : les produits ne seront jamais supprimés, leurs unités seront réassignées.'}
                  </p>
                </div>

                {/* خيارات إعادة التعيين */}
                <div className="space-y-2.5 mb-5 text-xs">
                  {units.filter((u) => u.id !== unitToDelete.id && u.name !== unitToDelete.name).length > 0 && (
                    <label
                      onClick={() => setReassignUnitOption('move_other')}
                      className={`block p-3 rounded-2xl border cursor-pointer transition-all ${
                        reassignUnitOption === 'move_other'
                          ? 'border-blue-500 bg-blue-50/60 shadow-sm'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <input
                          type="radio"
                          name="unit_reassign"
                          checked={reassignUnitOption === 'move_other'}
                          onChange={() => setReassignUnitOption('move_other')}
                          className="accent-blue-600"
                        />
                        <span className="font-bold text-slate-800">
                          {lang === 'ar'
                            ? 'تعيين المنتجات إلى وحدة قياس أخرى موجودة'
                            : 'Assigner à une autre unité existante'}
                        </span>
                      </div>
                      {reassignUnitOption === 'move_other' && (
                        <select
                          value={targetUnitName}
                          onChange={(e) => setTargetUnitName(e.target.value)}
                          className="neu-input w-full rounded-xl py-2 px-3 text-xs font-bold text-slate-700 bg-white mt-1.5"
                        >
                          {units
                            .filter((u) => u.id !== unitToDelete.id && u.name !== unitToDelete.name)
                            .map((u) => (
                              <option key={u.id} value={u.name}>
                                {u.name} {u.abbreviation ? `(${u.abbreviation})` : ''}
                              </option>
                            ))}
                        </select>
                      )}
                    </label>
                  )}

                  <label
                    onClick={() => setReassignUnitOption('default_piece')}
                    className={`block p-3 rounded-2xl border cursor-pointer transition-all ${
                      reassignUnitOption === 'default_piece'
                        ? 'border-blue-500 bg-blue-50/60 shadow-sm'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="unit_reassign"
                        checked={reassignUnitOption === 'default_piece'}
                        onChange={() => setReassignUnitOption('default_piece')}
                        className="accent-blue-600"
                      />
                      <div className="flex items-center gap-1.5 font-bold text-slate-800">
                        <Package className="w-3.5 h-3.5 text-slate-500" />
                        <span>
                          {lang === 'ar'
                            ? 'تعيين المنتجات إلى الوحدة الافتراضية (قطعة / Pièce)'
                            : "Assigner à l'unité par défaut (Pièce)"}
                        </span>
                      </div>
                    </div>
                  </label>
                </div>

                <div className="flex items-center gap-2.5 pt-3 border-t border-slate-100">
                  <NeuButton
                    variant="danger"
                    fullWidth
                    onClick={handleConfirmDeleteUnit}
                  >
                    {lang === 'ar' ? 'تأكيد التعيين وحذف الوحدة' : 'Réassigner et supprimer'}
                  </NeuButton>
                  <NeuButton
                    variant="default"
                    fullWidth
                    onClick={() => setUnitToDelete(null)}
                  >
                    {lang === 'ar' ? 'إلغاء' : 'Annuler'}
                  </NeuButton>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* نافذة تأكيد حذف منتج */}
      {productToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="neu-flat rounded-3xl p-6 w-full max-w-sm bg-white shadow-2xl text-center">
            <div className="w-12 h-12 rounded-2xl neu-inset mx-auto flex items-center justify-center text-rose-500 mb-3">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="font-extrabold text-base text-slate-800 mb-1">
              {t.confirmDelete}
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              سيتم حذف المنتج "{productToDelete.nameAr}" نهائيًا من قاعدة البيانات.
            </p>
            <div className="flex items-center justify-center gap-2">
              <NeuButton variant="danger" onClick={handleConfirmDelete} fullWidth>
                {t.yes}، احذف
              </NeuButton>
              <NeuButton variant="default" onClick={() => setProductToDelete(null)} fullWidth>
                {t.cancel}
              </NeuButton>
            </div>
          </div>
        </div>
      )}

      {/* نافذة طباعة الباركود */}
      {productToPrint && (
        <BarcodePrintModal
          product={productToPrint}
          onClose={() => setProductToPrint(null)}
          lang={lang}
          currency={t.currency}
          onProductUpdate={(updated) => setProductToPrint(updated)}
        />
      )}
    </div>
  );
};
