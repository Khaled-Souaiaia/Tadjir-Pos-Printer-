import React, { useState, useEffect, useMemo } from 'react';
import {
  Calendar,
  X,
  Check,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import { NeuButton } from '../common/NeuButton';
import {
  MONTHS_AR,
  MONTHS_FR,
  DAYS_AR_SHORT,
  DAYS_FR_SHORT,
  getLocalDateString,
  formatDateDisplay,
  formatDateLong,
  formatMonthYear,
  isValidDateRange,
  getDaysInMonth,
  getFirstDayOfMonth,
} from '../../utils/date-utils';

export interface CustomDateSelection {
  mode: 'range' | 'single' | 'month';
  startDate: string;  // YYYY-MM-DD
  endDate: string;    // YYYY-MM-DD
  singleDate: string; // YYYY-MM-DD
  year: number;
  month: number;      // 1-12
}

interface CustomDatePickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (selection: CustomDateSelection) => void;
  initialSelection?: CustomDateSelection;
  lang?: 'ar' | 'fr';
}

export const CustomDatePickerModal: React.FC<CustomDatePickerModalProps> = ({
  isOpen,
  onClose,
  onApply,
  initialSelection,
  lang = 'ar',
}) => {
  const isAr = lang === 'ar';

  const todayStr = useMemo(() => getLocalDateString(new Date()), []);
  const todayDate = useMemo(() => new Date(), []);
  const currentYear = todayDate.getFullYear();
  const currentMonth = todayDate.getMonth() + 1;

  // الحالة المحلية للنموذج
  const [mode, setMode] = useState<'range' | 'single' | 'month'>('range');
  const [startDate, setStartDate] = useState<string>(todayStr);
  const [endDate, setEndDate] = useState<string>(todayStr);
  const [singleDate, setSingleDate] = useState<string>(todayStr);
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [selectedMonth, setSelectedMonth] = useState<number>(currentMonth);

  // حالة عرض التقويم التفاعلي (الشهر والسنة المعروضين في التقويم)
  const [calendarYear, setCalendarYear] = useState<number>(currentYear);
  const [calendarMonth, setCalendarMonth] = useState<number>(currentMonth);

  // عند فتح النافذة، ملء البيانات الأولية
  useEffect(() => {
    if (isOpen) {
      if (initialSelection) {
        setMode(initialSelection.mode);
        setStartDate(initialSelection.startDate || todayStr);
        setEndDate(initialSelection.endDate || todayStr);
        setSingleDate(initialSelection.singleDate || todayStr);
        setSelectedYear(initialSelection.year || currentYear);
        setSelectedMonth(initialSelection.month || currentMonth);

        // ضبط التقويم التفاعلي
        if (initialSelection.mode === 'single' && initialSelection.singleDate) {
          const [y, m] = initialSelection.singleDate.split('-').map(Number);
          if (y && m) {
            setCalendarYear(y);
            setCalendarMonth(m);
          }
        } else if (initialSelection.mode === 'range' && initialSelection.startDate) {
          const [y, m] = initialSelection.startDate.split('-').map(Number);
          if (y && m) {
            setCalendarYear(y);
            setCalendarMonth(m);
          }
        } else if (initialSelection.mode === 'month') {
          setCalendarYear(initialSelection.year || currentYear);
          setCalendarMonth(initialSelection.month || currentMonth);
        }
      } else {
        setStartDate(todayStr);
        setEndDate(todayStr);
        setSingleDate(todayStr);
        setSelectedYear(currentYear);
        setSelectedMonth(currentMonth);
        setCalendarYear(currentYear);
        setCalendarMonth(currentMonth);
      }
    }
  }, [isOpen, initialSelection, todayStr, currentYear, currentMonth]);

  // إغلاق عند الضغط على مفتاح Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // التحقق من صحة النطاق
  const isRangeValid = mode !== 'range' || isValidDateRange(startDate, endDate);

  // حساب أيام الشهر للتقويم التفاعلي
  const daysInCurrentCalMonth = getDaysInMonth(calendarYear, calendarMonth);
  const firstDayOfWeek = getFirstDayOfMonth(calendarYear, calendarMonth); // 0 = Sunday

  // الأيام في التقويم
  const calendarDays = useMemo(() => {
    const days: Array<{ dayNumber: number; dateStr: string; isCurrentMonth: boolean }> = [];

    // الأيام من الشهر السابق لملء أول أسبوع
    const prevMonth = calendarMonth === 1 ? 12 : calendarMonth - 1;
    const prevYear = calendarMonth === 1 ? calendarYear - 1 : calendarYear;
    const daysInPrevMonth = getDaysInMonth(prevYear, prevMonth);

    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
      const dayNum = daysInPrevMonth - i;
      const dateStr = `${prevYear}-${String(prevMonth).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
      days.push({ dayNumber: dayNum, dateStr, isCurrentMonth: false });
    }

    // أيام الشهر الحالي
    for (let i = 1; i <= daysInCurrentCalMonth; i++) {
      const dateStr = `${calendarYear}-${String(calendarMonth).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      days.push({ dayNumber: i, dateStr, isCurrentMonth: true });
    }

    // الأيام من الشهر اللاحق لإكمال 35 أو 42 خلية
    const totalCells = days.length <= 35 ? 35 : 42;
    const remaining = totalCells - days.length;
    const nextMonth = calendarMonth === 12 ? 1 : calendarMonth + 1;
    const nextYear = calendarMonth === 12 ? calendarYear + 1 : calendarYear;

    for (let i = 1; i <= remaining; i++) {
      const dateStr = `${nextYear}-${String(nextMonth).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      days.push({ dayNumber: i, dateStr, isCurrentMonth: false });
    }

    return days;
  }, [calendarYear, calendarMonth, daysInCurrentCalMonth, firstDayOfWeek]);

  // التنقل بين شهور التقويم التفاعلي
  const handlePrevMonth = () => {
    if (calendarMonth === 1) {
      setCalendarMonth(12);
      setCalendarYear((y) => y - 1);
    } else {
      setCalendarMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (calendarMonth === 12) {
      setCalendarMonth(1);
      setCalendarYear((y) => y + 1);
    } else {
      setCalendarMonth((m) => m + 1);
    }
  };

  // النقر على يوم في التقويم
  const handleCalendarDayClick = (dateStr: string) => {
    if (mode === 'single') {
      setSingleDate(dateStr);
    } else if (mode === 'range') {
      // إذا كان النطاق محدداً بالفعل أو فارغ، نبدأ نطاقاً جديداً
      if (startDate && endDate && startDate !== endDate) {
        setStartDate(dateStr);
        setEndDate(dateStr);
      } else if (startDate && dateStr >= startDate) {
        setEndDate(dateStr);
      } else {
        setStartDate(dateStr);
        setEndDate(dateStr);
      }
    }
  };

  // اختصارات سريعة (Presets)
  const applyPreset = (preset: string) => {
    const now = new Date();
    const today = getLocalDateString(now);

    if (preset === 'today') {
      setMode('range');
      setStartDate(today);
      setEndDate(today);
      setCalendarYear(now.getFullYear());
      setCalendarMonth(now.getMonth() + 1);
    } else if (preset === 'yesterday') {
      const yDate = new Date(now);
      yDate.setDate(yDate.getDate() - 1);
      const yStr = getLocalDateString(yDate);
      setMode('range');
      setStartDate(yStr);
      setEndDate(yStr);
      setCalendarYear(yDate.getFullYear());
      setCalendarMonth(yDate.getMonth() + 1);
    } else if (preset === 'last7') {
      const sDate = new Date(now);
      sDate.setDate(sDate.getDate() - 6);
      const sStr = getLocalDateString(sDate);
      setMode('range');
      setStartDate(sStr);
      setEndDate(today);
      setCalendarYear(now.getFullYear());
      setCalendarMonth(now.getMonth() + 1);
    } else if (preset === 'last30') {
      const sDate = new Date(now);
      sDate.setDate(sDate.getDate() - 29);
      const sStr = getLocalDateString(sDate);
      setMode('range');
      setStartDate(sStr);
      setEndDate(today);
      setCalendarYear(now.getFullYear());
      setCalendarMonth(now.getMonth() + 1);
    } else if (preset === 'this_month') {
      const y = now.getFullYear();
      const m = now.getMonth() + 1;
      const sStr = `${y}-${String(m).padStart(2, '0')}-01`;
      const eStr = `${y}-${String(m).padStart(2, '0')}-${String(getDaysInMonth(y, m)).padStart(2, '0')}`;
      setMode('range');
      setStartDate(sStr);
      setEndDate(eStr);
      setCalendarYear(y);
      setCalendarMonth(m);
    } else if (preset === 'last_month') {
      const prevM = now.getMonth() === 0 ? 12 : now.getMonth();
      const prevY = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
      const sStr = `${prevY}-${String(prevM).padStart(2, '0')}-01`;
      const eStr = `${prevY}-${String(prevM).padStart(2, '0')}-${String(getDaysInMonth(prevY, prevM)).padStart(2, '0')}`;
      setMode('range');
      setStartDate(sStr);
      setEndDate(eStr);
      setCalendarYear(prevY);
      setCalendarMonth(prevM);
    } else if (preset === 'this_year') {
      const y = now.getFullYear();
      setMode('range');
      setStartDate(`${y}-01-01`);
      setEndDate(`${y}-12-31`);
      setCalendarYear(y);
      setCalendarMonth(1);
    } else if (preset === 'last_year') {
      const y = now.getFullYear() - 1;
      setMode('range');
      setStartDate(`${y}-01-01`);
      setEndDate(`${y}-12-31`);
      setCalendarYear(y);
      setCalendarMonth(1);
    }
  };

  // تطبيق الاختيار
  const handleApply = () => {
    if (!isRangeValid) return;

    onApply({
      mode,
      startDate,
      endDate,
      singleDate,
      year: selectedYear,
      month: selectedMonth,
    });
    onClose();
  };

  // النص التوضيحي للفترة المحددة للمعاينة
  const previewLabel = useMemo(() => {
    if (mode === 'single') {
      return formatDateLong(singleDate, lang);
    }
    if (mode === 'month') {
      return formatMonthYear(selectedYear, selectedMonth, lang);
    }
    if (mode === 'range') {
      if (!isRangeValid) {
        return isAr ? 'نطاق زمني غير صالح (تاريخ النهاية يسبق البداية)' : 'Plage invalide';
      }
      if (startDate === endDate) {
        return formatDateLong(startDate, lang);
      }
      return `${formatDateDisplay(startDate)} ← ${formatDateDisplay(endDate)}`;
    }
    return '';
  }, [mode, singleDate, selectedYear, selectedMonth, startDate, endDate, isRangeValid, isAr, lang]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="neu-flat rounded-3xl p-5 sm:p-6 w-full max-w-2xl bg-white shadow-2xl border border-white/80 my-auto animate-in zoom-in-95 duration-150 flex flex-col max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* الترويسة وزر الإغلاق */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl neu-inset flex items-center justify-center text-blue-600 bg-blue-50/60 shadow-inner">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-slate-800 tracking-tight">
                {isAr ? 'تحديد فترة وتقويم المبيعات' : 'Sélectionner la période des ventes'}
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                {isAr
                  ? 'اختر يوماً محدداً، نطاقاً زمنياً مخصصاً، أو أي شهر وسنة'
                  : 'Filtrez par jour, plage personnalisée ou mois/année spécifique'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl neu-raised flex items-center justify-center text-slate-400 hover:text-slate-700 transition-colors"
            title={isAr ? 'إغلاق' : 'Fermer'}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* أشرطة التبويب الثلاثية */}
        <div className="mt-4 p-1.5 rounded-2xl neu-inset bg-slate-100/70 flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setMode('range')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all text-center ${
              mode === 'range'
                ? 'neu-pressed bg-white text-blue-600 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {isAr ? 'نطاق زمني مخصص' : 'Plage personnalisée'}
          </button>

          <button
            type="button"
            onClick={() => setMode('single')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all text-center ${
              mode === 'single'
                ? 'neu-pressed bg-white text-blue-600 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {isAr ? 'يوم محدد' : 'Jour spécifique'}
          </button>

          <button
            type="button"
            onClick={() => setMode('month')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all text-center ${
              mode === 'month'
                ? 'neu-pressed bg-white text-blue-600 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {isAr ? 'شهر وسنة محددة' : 'Mois et Année'}
          </button>
        </div>

        {/* اختصارات الفترات السريعة (تظهر في وضع النطاق أو اليوم) */}
        {mode !== 'month' && (
          <div className="mt-3.5 flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px] font-bold">
            <span className="text-slate-400 shrink-0 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-500" />
              {isAr ? 'اختصارات:' : 'Raccourcis :'}
            </span>
            <button
              type="button"
              onClick={() => applyPreset('today')}
              className="px-2.5 py-1 rounded-lg neu-raised text-slate-700 hover:text-blue-600 shrink-0 transition-colors"
            >
              {isAr ? 'اليوم' : "Aujourd'hui"}
            </button>
            <button
              type="button"
              onClick={() => applyPreset('yesterday')}
              className="px-2.5 py-1 rounded-lg neu-raised text-slate-700 hover:text-blue-600 shrink-0 transition-colors"
            >
              {isAr ? 'الأمس' : 'Hier'}
            </button>
            <button
              type="button"
              onClick={() => applyPreset('last7')}
              className="px-2.5 py-1 rounded-lg neu-raised text-slate-700 hover:text-blue-600 shrink-0 transition-colors"
            >
              {isAr ? 'آخر 7 أيام' : '7 derniers jours'}
            </button>
            <button
              type="button"
              onClick={() => applyPreset('last30')}
              className="px-2.5 py-1 rounded-lg neu-raised text-slate-700 hover:text-blue-600 shrink-0 transition-colors"
            >
              {isAr ? 'آخر 30 يوم' : '30 derniers jours'}
            </button>
            <button
              type="button"
              onClick={() => applyPreset('this_month')}
              className="px-2.5 py-1 rounded-lg neu-raised text-slate-700 hover:text-blue-600 shrink-0 transition-colors"
            >
              {isAr ? 'الشهر الحالي' : 'Ce mois'}
            </button>
            <button
              type="button"
              onClick={() => applyPreset('last_month')}
              className="px-2.5 py-1 rounded-lg neu-raised text-slate-700 hover:text-blue-600 shrink-0 transition-colors"
            >
              {isAr ? 'الشهر الماضي' : 'Mois passé'}
            </button>
            <button
              type="button"
              onClick={() => applyPreset('this_year')}
              className="px-2.5 py-1 rounded-lg neu-raised text-slate-700 hover:text-blue-600 shrink-0 transition-colors"
            >
              {currentYear}
            </button>
            <button
              type="button"
              onClick={() => applyPreset('last_year')}
              className="px-2.5 py-1 rounded-lg neu-raised text-slate-700 hover:text-blue-600 shrink-0 transition-colors"
            >
              {currentYear - 1}
            </button>
          </div>
        )}

        {/* محتوى النمط: نطاق زمني */}
        {mode === 'range' && (
          <div className="mt-4 space-y-4">
            {/* مدخلات التاريخ الصريح */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 px-0.5">
                  {isAr ? 'من تاريخ (البداية) :' : 'Date de début :'}
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    if (e.target.value) {
                      const [y, m] = e.target.value.split('-').map(Number);
                      if (y && m) {
                        setCalendarYear(y);
                        setCalendarMonth(m);
                      }
                    }
                  }}
                  className="neu-input w-full rounded-2xl py-2 px-3 text-xs font-mono font-bold text-slate-800 bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 px-0.5">
                  {isAr ? 'إلى تاريخ (النهاية) :' : 'Date de fin :'}
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="neu-input w-full rounded-2xl py-2 px-3 text-xs font-mono font-bold text-slate-800 bg-white"
                />
              </div>
            </div>

            {/* رسالة الخطأ عند عدم صلاحية النطاق */}
            {!isRangeValid && (
              <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-xs font-bold text-rose-700 flex items-center gap-2 animate-in fade-in">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>
                  {isAr
                    ? `تنبيه: تاريخ النهاية (${formatDateDisplay(endDate)}) يسبق تاريخ البداية (${formatDateDisplay(startDate)}). يرجى تحديد تاريخ نهاية صحيح.`
                    : 'Erreur : la date de fin doit être postérieure ou égale à la date de début.'}
                </span>
              </div>
            )}

            {/* التقويم التفاعلي المرئي */}
            <div className="p-3.5 rounded-2xl neu-inset bg-slate-50/80 border border-slate-200/60">
              <div className="flex items-center justify-between mb-3 px-1">
                <button
                  type="button"
                  onClick={handlePrevMonth}
                  className="p-1.5 rounded-xl neu-raised text-slate-600 hover:text-blue-600"
                  title={isAr ? 'الشهر السابق' : 'Mois précédent'}
                >
                  <ChevronRight className="w-4 h-4 rtl:rotate-180" />
                </button>

                <div className="font-extrabold text-xs text-slate-800 flex items-center gap-2">
                  <span>{formatMonthYear(calendarYear, calendarMonth, lang)}</span>
                </div>

                <button
                  type="button"
                  onClick={handleNextMonth}
                  className="p-1.5 rounded-xl neu-raised text-slate-600 hover:text-blue-600"
                  title={isAr ? 'الشهر التالي' : 'Mois suivant'}
                >
                  <ChevronLeft className="w-4 h-4 rtl:rotate-180" />
                </button>
              </div>

              {/* أسماء الأيام */}
              <div className="grid grid-cols-7 gap-1 text-center mb-1 text-[11px] font-bold text-slate-400">
                {(isAr ? DAYS_AR_SHORT : DAYS_FR_SHORT).map((dayName, idx) => (
                  <div key={idx} className="py-1">
                    {dayName}
                  </div>
                ))}
              </div>

              {/* شبكة أيام التقويم */}
              <div className="grid grid-cols-7 gap-1 text-xs">
                {calendarDays.map((cell, idx) => {
                  const isSelectedStart = cell.dateStr === startDate;
                  const isSelectedEnd = cell.dateStr === endDate;
                  const isInRange =
                    startDate && endDate && cell.dateStr >= startDate && cell.dateStr <= endDate;
                  const isToday = cell.dateStr === todayStr;

                  let cellClasses = 'neu-raised text-slate-700 bg-white hover:bg-blue-50';

                  if (isSelectedStart || isSelectedEnd) {
                    cellClasses = 'bg-blue-600 text-white font-extrabold shadow-md scale-95 ring-2 ring-blue-300';
                  } else if (isInRange) {
                    cellClasses = 'bg-blue-100/90 text-blue-900 font-bold border border-blue-200/60';
                  } else if (!cell.isCurrentMonth) {
                    cellClasses = 'text-slate-300 opacity-40 neu-raised bg-slate-50';
                  }

                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleCalendarDayClick(cell.dateStr)}
                      className={`h-8 sm:h-9 rounded-xl flex items-center justify-center transition-all cursor-pointer font-mono text-xs ${cellClasses} ${
                        isToday && !isSelectedStart && !isSelectedEnd && !isInRange
                          ? 'border border-blue-400 font-extrabold text-blue-600'
                          : ''
                      }`}
                    >
                      {cell.dayNumber}
                    </button>
                  );
                })}
              </div>

              <div className="mt-2 text-[10px] text-slate-400 text-center">
                {isAr
                  ? 'انقر على اليوم الأول لبدء النطاق، ثم انقر على اليوم الثاني لتحديده'
                  : 'Cliquez sur le premier jour puis le second pour définir la plage'}
              </div>
            </div>
          </div>
        )}

        {/* محتوى النمط: يوم محدد */}
        {mode === 'single' && (
          <div className="mt-4 space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 px-0.5">
                {isAr ? 'اختر اليوم المحدد :' : 'Sélectionnez le jour :'}
              </label>
              <input
                type="date"
                value={singleDate}
                onChange={(e) => {
                  setSingleDate(e.target.value);
                  if (e.target.value) {
                    const [y, m] = e.target.value.split('-').map(Number);
                    if (y && m) {
                      setCalendarYear(y);
                      setCalendarMonth(m);
                    }
                  }
                }}
                className="neu-input w-full rounded-2xl py-2 px-3 text-xs font-mono font-bold text-slate-800 bg-white"
              />
            </div>

            {/* تقويم النقر المباشر على اليوم */}
            <div className="p-3.5 rounded-2xl neu-inset bg-slate-50/80 border border-slate-200/60">
              <div className="flex items-center justify-between mb-3 px-1">
                <button
                  type="button"
                  onClick={handlePrevMonth}
                  className="p-1.5 rounded-xl neu-raised text-slate-600 hover:text-blue-600"
                >
                  <ChevronRight className="w-4 h-4 rtl:rotate-180" />
                </button>

                <div className="font-extrabold text-xs text-slate-800">
                  {formatMonthYear(calendarYear, calendarMonth, lang)}
                </div>

                <button
                  type="button"
                  onClick={handleNextMonth}
                  className="p-1.5 rounded-xl neu-raised text-slate-600 hover:text-blue-600"
                >
                  <ChevronLeft className="w-4 h-4 rtl:rotate-180" />
                </button>
              </div>

              <div className="grid grid-cols-7 gap-1 text-center mb-1 text-[11px] font-bold text-slate-400">
                {(isAr ? DAYS_AR_SHORT : DAYS_FR_SHORT).map((dayName, idx) => (
                  <div key={idx} className="py-1">
                    {dayName}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-1 text-xs">
                {calendarDays.map((cell, idx) => {
                  const isSelected = cell.dateStr === singleDate;
                  const isToday = cell.dateStr === todayStr;

                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleCalendarDayClick(cell.dateStr)}
                      className={`h-8 sm:h-9 rounded-xl flex items-center justify-center transition-all cursor-pointer font-mono text-xs ${
                        isSelected
                          ? 'bg-blue-600 text-white font-extrabold shadow-md scale-95 ring-2 ring-blue-300'
                          : cell.isCurrentMonth
                          ? 'neu-raised text-slate-700 bg-white hover:bg-blue-50'
                          : 'text-slate-300 opacity-40 neu-raised bg-slate-50'
                      } ${isToday && !isSelected ? 'border border-blue-400 font-extrabold text-blue-600' : ''}`}
                    >
                      {cell.dayNumber}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* محتوى النمط: شهر وسنة محددة */}
        {mode === 'month' && (
          <div className="mt-4 space-y-4">
            {/* اختيار السنة (غير مقيد بالسنة الحالية) */}
            <div className="p-3.5 rounded-2xl neu-inset bg-slate-50/80 border border-slate-200/60 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700">
                {isAr ? 'السنة المالية المستهدفة :' : "Année fiscale cible :"}
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedYear((y) => y - 1)}
                  className="px-2.5 py-1.5 rounded-xl neu-raised text-slate-700 hover:text-blue-600 text-xs font-bold"
                  title={isAr ? 'السنة السابقة' : 'Année précédente'}
                >
                  -1
                </button>

                <input
                  type="number"
                  min="2020"
                  max="2035"
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(parseInt(e.target.value, 10) || currentYear)}
                  className="neu-input w-24 text-center rounded-xl py-1.5 text-sm font-extrabold font-mono text-blue-700 bg-white"
                />

                <button
                  type="button"
                  onClick={() => setSelectedYear((y) => y + 1)}
                  className="px-2.5 py-1.5 rounded-xl neu-raised text-slate-700 hover:text-blue-600 text-xs font-bold"
                  title={isAr ? 'السنة التالية' : 'Année suivante'}
                >
                  +1
                </button>
              </div>
            </div>

            {/* شبكة الـ 12 شهراً كاملة */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2 px-0.5">
                {isAr ? 'اختر الشهر :' : 'Sélectionnez le mois :'}
              </label>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
                {(isAr ? MONTHS_AR : MONTHS_FR).map((monthName, idx) => {
                  const mNum = idx + 1;
                  const isSelected = selectedMonth === mNum;
                  const isCurrent = mNum === currentMonth && selectedYear === currentYear;

                  return (
                    <button
                      key={mNum}
                      type="button"
                      onClick={() => setSelectedMonth(mNum)}
                      className={`p-3 rounded-2xl text-xs font-bold transition-all text-start flex flex-col gap-1 cursor-pointer ${
                        isSelected
                          ? 'neu-pressed bg-blue-600 text-white shadow-md border-2 border-blue-400'
                          : 'neu-raised bg-white text-slate-700 hover:text-blue-600 hover:bg-blue-50/50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-[11px] opacity-70">
                          {String(mNum).padStart(2, '0')}
                        </span>
                        {isCurrent && (
                          <span
                            className={`px-1.5 py-0.2 rounded-full text-[9px] font-black ${
                              isSelected
                                ? 'bg-white text-blue-600'
                                : 'bg-blue-50 text-blue-600 border border-blue-200'
                            }`}
                          >
                            {isAr ? 'الحالي' : 'Actuel'}
                          </span>
                        )}
                      </div>
                      <span className="text-xs font-extrabold truncate">{monthName}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* بطاقة المعاينة المباشرة */}
        <div className="mt-5 p-3.5 rounded-2xl bg-blue-50/70 border border-blue-200/80 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-slate-700">
            <Calendar className="w-4 h-4 text-blue-600 shrink-0" />
            <span className="font-bold">{isAr ? 'الفترة المحددة:' : 'Période sélectionnée :'}</span>
            <span className="font-extrabold text-blue-800 font-mono bg-white px-2 py-0.5 rounded-lg border border-blue-200">
              {previewLabel}
            </span>
          </div>

          <button
            type="button"
            onClick={() => {
              setStartDate(todayStr);
              setEndDate(todayStr);
              setSingleDate(todayStr);
              setSelectedYear(currentYear);
              setSelectedMonth(currentMonth);
            }}
            className="text-[11px] text-slate-500 hover:text-slate-800 flex items-center gap-1 font-semibold"
            title={isAr ? 'إعادة ضبط لليوم' : "Réinitialiser à aujourd'hui"}
          >
            <RotateCcw className="w-3 h-3" />
            <span>{isAr ? 'إعادة ضبط' : 'Réinitialiser'}</span>
          </button>
        </div>

        {/* أزرار الإجراءات */}
        <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
          <NeuButton
            type="button"
            variant="default"
            size="sm"
            onClick={onClose}
          >
            {isAr ? 'إلغاء' : 'Annuler'}
          </NeuButton>

          <NeuButton
            type="button"
            variant="primary"
            size="sm"
            onClick={handleApply}
            disabled={!isRangeValid}
            icon={<Check className="w-4 h-4" />}
          >
            {isAr ? 'تطبيق الفلتر' : 'Appliquer le filtre'}
          </NeuButton>
        </div>
      </div>
    </div>
  );
};
