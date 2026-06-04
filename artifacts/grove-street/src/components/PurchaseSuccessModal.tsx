import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { playSfx } from "@/lib/audio";
import { useEffect } from "react";

interface PurchaseSuccessModalProps {
  open: boolean;
  onClose: () => void;
  productName: string;
  price: number;
  pointsEarned: number;
  orderId?: number;
  newBalance?: number;
}

export function PurchaseSuccessModal({ open, onClose, productName, price, pointsEarned, orderId, newBalance }: PurchaseSuccessModalProps) {
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (open) playSfx("success");
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="absolute inset-0 bg-black/80"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          />
          <motion.div
            className="relative w-full max-w-md rounded-2xl overflow-hidden"
            style={{ background: "linear-gradient(135deg, #0a1a0f 0%, #0d2b18 50%, #0a1a0f 100%)", border: "1px solid hsl(142 70% 35% / 0.4)" }}
            initial={{ scale: 0.8, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0, y: 20 }}
            transition={{ type: "spring", damping: 20, stiffness: 300 }}
          >
            <button
              onClick={onClose}
              className="absolute top-4 left-4 text-white/50 hover:text-white transition-colors z-10"
              data-testid="button-close-modal"
            >
              <X size={20} />
            </button>

            <div className="p-8 text-center">
              <motion.div
                className="mx-auto w-20 h-20 rounded-full flex items-center justify-center mb-6"
                style={{ background: "hsl(142 70% 35% / 0.2)", border: "2px solid hsl(142 70% 35%)" }}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", delay: 0.2, damping: 15 }}
              >
                <motion.div
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: "spring", delay: 0.3, damping: 12 }}
                >
                  <CheckCircle size={40} className="text-primary" />
                </motion.div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
              >
                <h2 className="text-2xl font-bold text-white mb-2">تم تنفيذ الطلب بنجاح</h2>
                <p className="text-primary font-bold text-lg mb-6">{productName}</p>

                <div className="space-y-3 mb-6">
                  <div className="flex justify-between items-center rounded-lg p-3" style={{ background: "rgba(255,255,255,0.05)" }}>
                    <span className="text-muted-foreground text-sm">المبلغ المدفوع</span>
                    <span className="text-white font-bold">{price} د.أ</span>
                  </div>
                  <div className="flex justify-between items-center rounded-lg p-3" style={{ background: "rgba(255,255,255,0.05)" }}>
                    <span className="text-muted-foreground text-sm">النقاط المكتسبة</span>
                    <span className="text-primary font-bold">+{pointsEarned} نقطة</span>
                  </div>
                  {newBalance !== undefined && (
                    <div className="flex justify-between items-center rounded-lg p-3" style={{ background: "rgba(255,255,255,0.05)" }}>
                      <span className="text-muted-foreground text-sm">رصيدك الجديد</span>
                      <span className="text-white font-bold">{newBalance.toFixed(2)} د.أ</span>
                    </div>
                  )}
                </div>

                <p className="text-muted-foreground text-sm mb-6">تم خصم الرصيد من محفظتك</p>

                <div className="flex gap-3">
                  {orderId && (
                    <Button
                      onClick={() => { setLocation(`/orders/${orderId}`); onClose(); }}
                      variant="outline"
                      className="flex-1"
                      data-testid="button-view-order"
                    >
                      عرض الطلب
                    </Button>
                  )}
                  <Button
                    onClick={onClose}
                    className="flex-1 bg-primary hover:bg-primary/90"
                    data-testid="button-continue-shopping"
                  >
                    متابعة التسوق
                  </Button>
                </div>
              </motion.div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

