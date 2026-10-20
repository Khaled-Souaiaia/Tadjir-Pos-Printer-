/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { AppProvider, useApp } from './contexts/AppContext';
import { Navbar } from './components/layout/Navbar';
import { Sidebar, TabType } from './components/layout/Sidebar';
import { BarcodeScannerListener } from './components/common/BarcodeScannerListener';
import { ToastContainer } from './components/common/ToastContainer';
import { LoginPage } from './pages/LoginPage';
import { PosPage } from './pages/PosPage';
import { DashboardPage } from './pages/DashboardPage';
import { ProductsPage } from './pages/ProductsPage';
import { ClientsSuppliersPage } from './pages/ClientsSuppliersPage';
import { ExpensesPage } from './pages/ExpensesPage';
import { ReportsPage } from './pages/ReportsPage';
import { SettingsPage } from './pages/SettingsPage';
import { AboutPage } from './pages/AboutPage';
import { ActivationModal } from './components/license/ActivationModal';
import { motion, AnimatePresence } from 'motion/react';

const MainLayout: React.FC = () => {
  const { currentUser, isActivated, isCheckingLicense } = useApp();
  const [activeTab, setActiveTab] = useState<TabType>('pos');

  // الفحص الأولي للترخيص عند الإقلاع يتم بصمت في الخلفية دون أية شاشات تحميل أو رسائل مؤقتة
  if (isCheckingLicense) {
    return <div className="min-h-screen bg-[#E8EDF5]" />;
  }

  // إذا لم يكن البرنامج مفعلاً، يتم إظهار شاشة التفعيل الاحترافية الإلزامية وقفل النظام بالكامل
  if (!isActivated) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <ActivationModal
          isOpen={true}
          onSuccess={() => {}}
          isClosable={false}
        />
        <ToastContainer />
      </div>
    );
  }

  if (!currentUser) {
    return <LoginPage />;
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* قارئ الباركود التلقائي في الخلفية */}
      <BarcodeScannerListener />

      {/* الشريط العلوي للمحل */}
      <Navbar />

      {/* محتوى البرنامج الرئيسي */}
      <main className="flex-1 max-w-[1600px] w-full mx-auto px-4 md:px-6 pb-6 flex flex-col md:flex-row gap-5">
        {/* القائمة الجانبية ثلاثية الأبعاد */}
        <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

        {/* عرض الصفحة الحالية مع حركة Framer Motion ناعمة */}
        <section className="flex-1 min-w-0">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
              className="h-full"
            >
              {activeTab === 'pos' && <PosPage />}
              {activeTab === 'dashboard' && (
                <DashboardPage onNavigate={(tab) => setActiveTab(tab)} />
              )}
              {activeTab === 'products' && <ProductsPage />}
              {activeTab === 'clients' && <ClientsSuppliersPage />}
              {activeTab === 'expenses' && <ExpensesPage />}
              {activeTab === 'reports' && <ReportsPage />}
              {activeTab === 'settings' && <SettingsPage />}
              {activeTab === 'about' && <AboutPage />}
            </motion.div>
          </AnimatePresence>
        </section>
      </main>

      {/* التنبيهات المنبثقة */}
      <ToastContainer />
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <MainLayout />
    </AppProvider>
  );
}
