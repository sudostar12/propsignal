"use client"

import * as React from "react"
import * as RechartsPrimitive from "recharts"
//import type { TooltipProps } from "recharts"

import { cn } from "@/lib/utils"

type ChartTooltipContentProps = React.ComponentProps<"div"> & {
    active?: boolean
    payload?: any[]
    label?: string | number
    labelFormatter?: (label: any, payload: any) => React.ReactNode
    formatter?: any
    color?: string
    hideLabel?: boolean
    hideIndicator?: boolean
    indicator?: "line" | "dot" | "dashed"
    nameKey?: string
    labelKey?: string
    labelClassName?: string
  }

// Supported themes object
const THEMES = { light: "", dark: ".dark" } as const

// Chart configuration type for color and label mappings
export type ChartConfig = {
  [k in string]: {
    label?: React.ReactNode
    icon?: React.ComponentType
  } & (
    | { color?: string; theme?: never }
    | { color?: never; theme: Record<keyof typeof THEMES, string> }
  )
}

type ChartContextProps = {
  config: ChartConfig
}

const ChartContext = React.createContext<ChartContextProps | null>(null)

// Custom hook to get chart context
function useChart() {
  const context = React.useContext(ChartContext)
  if (!context) {
    throw new Error("useChart must be used within a <ChartContainer />")
  }
  return context
}

// Chart container with context provider
const ChartContainer = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div"> & {
    config: ChartConfig
    children: React.ComponentProps<typeof RechartsPrimitive.ResponsiveContainer>["children"]
  }
>(({ id, className, children, config, ...props }, ref) => {
  const uniqueId = React.useId()
  const chartId = `chart-${id || uniqueId.replace(/:/g, "")}`

  return (
    <ChartContext.Provider value={{ config }}>
      <div
        data-chart={chartId}
        ref={ref}
        className={cn("flex aspect-video justify-center text-xs", className)}
        {...props}
      >
        <ChartStyle id={chartId} config={config} />
        <RechartsPrimitive.ResponsiveContainer>
          {children}
        </RechartsPrimitive.ResponsiveContainer>
      </div>
    </ChartContext.Provider>
  )
})
ChartContainer.displayName = "ChartContainer"

// Style injection to support dynamic color theming
const ChartStyle = ({ id, config }: { id: string; config: ChartConfig }) => {
  const colorConfig = Object.entries(config).filter(
    ([_, cfg]) => cfg.theme || cfg.color
  )
  if (!colorConfig.length) return null

  return (
    <style
      dangerouslySetInnerHTML={{
        __html: Object.entries(THEMES)
          .map(
            ([theme, prefix]) => `
${prefix} [data-chart=${id}] {
${colorConfig
  .map(([key, cfg]) => {
    const color = cfg.theme?.[theme as keyof typeof cfg.theme] || cfg.color
    return color ? `  --color-${key}: ${color};` : null
  })
  .join("\n")}
}
`
          )
          .join("\n"),
      }}
    />
  )
}

// Base Recharts tooltip component (exposed)
const ChartTooltip = RechartsPrimitive.Tooltip

// Custom tooltip content component
const ChartTooltipContent = React.forwardRef<HTMLDivElement, ChartTooltipContentProps>(
  (
    {
      active,
      payload,
      className,
      indicator = "dot",
      hideLabel = false,
      hideIndicator = false,
      //label,
      labelFormatter,
      labelClassName,
      //formatter,
      color,
      nameKey,
      //labelKey,
      ...rest
    },
    ref
  ) => {
    const { config } = useChart()

    if (!active || !payload?.length) {
      return null
    }

    // Tooltip header label
    const nameValue = payload[0]?.name

    const tooltipLabel = !hideLabel && nameValue !== undefined
      ? (
          <div className={cn("font-medium", labelClassName)}>
            {labelFormatter && typeof nameValue === "string"
              ? labelFormatter(nameValue, payload)
              : nameValue}
          </div>
        )
      : null

    return (
      <div
        ref={ref}
        {...rest}
        className={cn(
          "grid min-w-[8rem] items-start gap-1.5 rounded-lg border border-border/50 bg-background px-2.5 py-1.5 text-xs shadow-xl",
          className
        )}
      >
        {tooltipLabel}
        <div className="grid gap-1.5">
          {payload.map(
            (
              item: {
                value: string
                type: string
                id?: string
                color?: string
                dataKey?: string
                name?: string
                payload?: any
                [key: string]: any
              },
              index: number
            ) => {
              const key = `${nameKey || item.name || item.dataKey || "value"}`
              const itemConfig = getPayloadConfigFromPayload(config, item, key)
              const indicatorColor = color || item.color || item.payload?.fill

              return (
                <div
                  key={item.dataKey || index}
                  className={cn("flex w-full items-center gap-2")}
                >
                  {!hideIndicator && (
                    <div
                      className={cn(
                        "shrink-0 rounded",
                        indicator === "dot" && "h-2.5 w-2.5",
                        indicator === "line" && "w-1 h-4",
                        indicator === "dashed" && "w-0 h-4 border border-dashed bg-transparent"
                      )}
                      style={{
                        backgroundColor: indicatorColor,
                        borderColor: indicatorColor,
                      }}
                    />
                  )}
                  <div className="flex flex-1 justify-between">
                    <span className="text-muted-foreground">
                      {itemConfig?.label || item.name}
                    </span>
                    <span className="font-mono font-medium tabular-nums text-foreground">
                      {item.value?.toLocaleString()}
                    </span>
                  </div>
                </div>
              )
            }
          )}
        </div>
      </div>
    )
  }
)
ChartTooltipContent.displayName = "ChartTooltipContent"

// Base Recharts legend component (exposed)
const ChartLegend = RechartsPrimitive.Legend

// Custom legend content component
const ChartLegendContent = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div"> & {
    payload?: {
      value: string
      type: string
      id?: string
      color?: string
      dataKey?: string
      payload?: Record<string, unknown>
      [key: string]: any
    }[]
    verticalAlign?: "top" | "bottom" | "middle"
    hideIcon?: boolean
    nameKey?: string
  }
>(
  ({ className, hideIcon = false, payload, verticalAlign = "bottom", nameKey }, ref) => {
    const { config } = useChart()

    if (!payload?.length) {
      return null
    }

    return (
      <div
        ref={ref}
        className={cn(
          "flex items-center justify-center gap-4",
          verticalAlign === "top" ? "pb-3" : "pt-3",
          className
        )}
      >
        {payload.map((item) => {
          const key = `${nameKey || item.dataKey || "value"}`
          const itemConfig = getPayloadConfigFromPayload(config, item, key)

          return (
            <div
              key={item.value}
              className="flex items-center gap-1.5"
            >
              {!hideIcon ? (
                <div
                  className="h-2 w-2 shrink-0 rounded-[2px]"
                  style={{ backgroundColor: item.color }}
                />
              ) : null}
              {itemConfig?.label}
            </div>
          )
        })}
      </div>
    )
  }
)
ChartLegendContent.displayName = "ChartLegendContent"

// Helper to get item config from payload
function getPayloadConfigFromPayload(
  config: ChartConfig,
  payload: Record<string, unknown>,
  key: string
) {
  if (typeof payload !== "object" || payload === null) return undefined

  const payloadPayload =
    "payload" in payload &&
    typeof payload.payload === "object" &&
    payload.payload !== null
      ? payload.payload as Record<string, unknown>
      : undefined

  let configLabelKey: string = key

  if (key in payload) {
    const value = payload[key]
    if (typeof value === "string") {
      configLabelKey = value
    }
  } else if (payloadPayload && key in payloadPayload) {
    const innerValue = payloadPayload[key]
    if (typeof innerValue === "string") {
      configLabelKey = innerValue
    }
  }

  return configLabelKey in config
    ? config[configLabelKey]
    : config[key as keyof typeof config]
}


// Export all components
export {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  ChartStyle,
}