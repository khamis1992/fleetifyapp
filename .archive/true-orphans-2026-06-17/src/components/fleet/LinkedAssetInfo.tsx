import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Link } from "react-router-dom"
import { ExternalLink, Building } from "lucide-react"
import { useFixedAssetByCode } from "@/hooks/useFixedAssetByCode"
import { LoadingSpinner } from "@/components/ui/loading-spinner"

interface LinkedAssetInfoProps {
  fixedAssetId?: string
  assetCode?: string
}

export function LinkedAssetInfo({ fixedAssetId, assetCode }: LinkedAssetInfoProps) {
  const { data: asset, isLoading } = useFixedAssetByCode(assetCode)

  if (!fixedAssetId && !assetCode) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-right flex items-center gap-2">
            <Building className="h-4 w-4" />
            الأصل الثابت المرتبط
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-right">
            هذه المركبة غير مربوطة بأصل ثابت
          </p>
        </CardContent>
      </Card>
    )
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-right flex items-center gap-2">
            <Building className="h-4 w-4" />
            الأصل الثابت المرتبط
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-4">
            <LoadingSpinner size="sm" />
            <span className="mr-2 text-sm">جاري تحميل بيانات الأصل...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!asset) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-right flex items-center gap-2">
            <Building className="h-4 w-4" />
            الأصل الثابت المرتبط
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-right">
            <Badge variant="secondary" className="mb-2">
              رقم الأصل: {assetCode}
            </Badge>
            <p className="text-sm text-red-600">
              تعذر العثور على بيانات الأصل الثابت
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-right flex items-center gap-2 justify-between">
          <div className="flex items-center gap-2">
            <Building className="h-4 w-4" />
            الأصل الثابت المرتبط
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link to="/finance/assets" className="flex items-center gap-1">
              <ExternalLink className="h-3 w-3" />
              عرض في الأصول
            </Link>
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-right">
        <div>
          <Badge variant="outline" className="mb-2">
            {asset.asset_code}
          </Badge>
          <h4 className="font-medium">{asset.asset_name}</h4>
          {asset.asset_name_ar && (
            <p className="text-sm text-muted-foreground">{asset.asset_name_ar}</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          {asset.purchase_date && (
            <div>
              <span className="font-medium">تاريخ الشراء:</span>
              <p>{new Date(asset.purchase_date).toLocaleDateString('ar-KW')}</p>
            </div>
          )}
          
          {asset.purchase_cost && (
            <div>
              <span className="font-medium">تكلفة الشراء:</span>
              <p>{asset.purchase_cost.toLocaleString()} د.ك</p>
            </div>
          )}
          
          {asset.salvage_value && (
            <div>
              <span className="font-medium">القيمة التخريدية:</span>
              <p>{asset.salvage_value.toLocaleString()} د.ك</p>
            </div>
          )}
          
          {asset.useful_life_years && (
            <div>
              <span className="font-medium">العمر الإنتاجي:</span>
              <p>{asset.useful_life_years} سنة</p>
            </div>
          )}
        </div>

        {asset.location && (
          <div className="pt-2 border-t">
            <span className="text-sm font-medium">الموقع:</span>
            <p className="text-sm">{asset.location}</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}