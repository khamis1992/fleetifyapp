# 💰 Financial Tracking System - Quick Reference

## 🚀 Access
**URL:** `/financial-tracking`

## ⚡ Quick Start
1. Type customer name (e.g., "محمد")
2. Select from dropdown
3. Enter amount & date
4. Click "إضافة الدفعة"

## 💡 Fine Calculation
```
Due: Day 1 of month
Fine: 120 QAR/day
Max: 3000 QAR/month

Example:
Payment on Aug 1 for July rent (1000 QAR)
= 1000 + 3000 fine = 4000 QAR total
```

## 📊 Features
✅ Real-time search
✅ Auto fine calculation
✅ Payment history
✅ Summary analytics
✅ LocalStorage persistence
✅ RTL Arabic support

## 🎨 Sample Customers
- محمد أحمد (1000 QAR)
- محمد علي (1200 QAR)
- أحمد خالد (900 QAR)
- سعيد محمود (1500 QAR)
- علي حسن (1100 QAR)
- خالد سالم (1300 QAR)

## 📝 Data Structure
```typescript
Receipt {
  customerName: string
  month: string (Arabic)
  rentAmount: number
  paymentDate: string (ISO)
  fine: number (auto-calculated)
  totalPaid: number
}
```

**Status:** ✅ Production Ready
**Version:** 1.0.0
