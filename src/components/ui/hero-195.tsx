/**
 * Hero 195 Component
 * Modern hero section with Border Beam and Tracing Beam effects
 */

import * as React from "react"
import { BorderBeam } from "./border-beam"
import { TracingBeam } from "./tracing-beam"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "./card"
import { Button } from "./button"
import { Input } from "./input"
import { Label } from "./label"
import { cn } from "@/lib/utils"

interface Hero195Props {
  className?: string
}

export function Hero195({ className }: Hero195Props) {
  const [email, setEmail] = useState("")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    console.log("Email submitted:", email)
    // Handle email submission
  }

  return (
    <div className={cn("relative min-h-screen bg-background", className)}>
      <TracingBeam>
        <div className="container mx-auto px-4 py-16">
          {/* Hero Header */}
          <div className="text-center mb-16">
            <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
              مرحباً بك في FleetifyApp
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground mb-8">
              نظام إدارة الأساطيل الأكثر تطوراً
            </p>
          </div>

          {/* Feature Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
            {features.map((feature, index) => (
              <Card key={index} className="relative overflow-hidden">
                <BorderBeam
                  size={250}
                  duration={12 + index}
                  delay={index * 2}
                />
                <CardHeader>
                  <div className="mb-4 text-4xl">{feature.icon}</div>
                  <CardTitle>{feature.title}</CardTitle>
                  <CardDescription>{feature.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button variant="outline" className="w-full">
                    اعرف المزيد
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* CTA Section */}
          <Card className="relative overflow-hidden max-w-2xl mx-auto">
            <BorderBeam colorFrom="#60a5fa" colorTo="#a78bfa" />
            <CardHeader>
              <CardTitle className="text-center">ابدأ اليوم</CardTitle>
              <CardDescription className="text-center">
                سجّل الآن واحصل على نسخة تجريبية مجانية
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">البريد الإلكتروني</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="example@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" size="lg">
                  ابدأ الآن
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </TracingBeam>
    </div>
  )
}

// Feature data
const features = [
  {
    icon: "🚗",
    title: "إدارة الأسطول",
    description: "تتبع وإدارة جميع مركباتك بكفاءة عالية",
  },
  {
    icon: "📋",
    title: "إدارة العقود",
    description: "نظام متكامل لإدارة عقود التأجير والخدمات",
  },
  {
    icon: "💰",
    title: "النظام المالي",
    description: "محاسبة شاملة مع تقارير مالية تفصيلية",
  },
]

