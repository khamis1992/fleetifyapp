/**
 * Hero Demo Page
 * عرض توضيحي لمكون Hero مع Border Beam و Tracing Beam
 */

import { Hero195 } from "@/components/ui/hero-195"
import { PageCustomizer } from "@/components/PageCustomizer"

export default function HeroDemo() {
  return (
    <PageCustomizer
      pageId="hero-demo"
      title="Hero Demo"
      titleAr="عرض Hero"
    >
      <Hero195 />
    </PageCustomizer>
  )
}

