import { matchFont } from "@shopify/react-native-skia";
import { Platform, View } from "react-native";
import { useCSSVariable } from "uniwind";
import { Bar, CartesianChart } from "victory-native";

import { useTranslation } from "@turbostarter/i18n";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
  CardContent,
} from "@turbostarter/ui-mobile/card";
import { Icons } from "@turbostarter/ui-mobile/icons";
import { Text } from "@turbostarter/ui-mobile/text";

const useChartData = () => {
  const color1 = useCSSVariable("--chart-1");
  const color2 = useCSSVariable("--chart-2");
  const color3 = useCSSVariable("--chart-3");
  const color4 = useCSSVariable("--chart-4");
  const color5 = useCSSVariable("--chart-5");

  return [
    {
      browser: "chrome",
      label: "Chrome",
      visitors: 187,
      color: color1,
    },
    {
      browser: "safari",
      label: "Safari",
      visitors: 200,
      color: color2,
    },
    {
      browser: "firefox",
      label: "Firefox",
      visitors: 275,
      color: color3,
    },
    { browser: "edge", label: "Edge", visitors: 173, color: color4 },
    { browser: "other", label: "Opera", visitors: 90, color: color5 },
  ];
};

export function BarChart() {
  const { t } = useTranslation(["common", "dashboard"]);
  const mutedForeground = useCSSVariable("--muted-foreground");

  const chartData = useChartData();

  return (
    <Card className="w-full">
      <CardHeader className="gap-0">
        <CardTitle className="text-lg leading-tight">
          {t("chart.bar")}
        </CardTitle>
        <CardDescription>{t("chart.period")}</CardDescription>
      </CardHeader>

      <CardContent className="h-[200px] px-5">
        <CartesianChart
          data={chartData}
          xKey="browser"
          yKeys={["visitors"]}
          domainPadding={{ left: 35, right: 35, bottom: 25 }}
          padding={{ bottom: 12 }}
          xAxis={{
            font: matchFont({
              fontFamily: Platform.select({
                android: "helvetica",
                ios: "Helvetica Neue",
              }),
              fontSize: 12,
            }),
            lineWidth: 0,
            formatXLabel: (value) =>
              chartData.find((data) => data.browser === value)?.label ?? value,
            labelOffset: 6,
            labelColor: mutedForeground?.toString(),
          }}
        >
          {({ points, chartBounds }) => {
            return points.visitors.map((point) => {
              return (
                <Bar
                  key={point.xValue}
                  barCount={points.visitors.length}
                  chartBounds={chartBounds}
                  points={[point]}
                  innerPadding={0.15}
                  roundedCorners={{
                    topLeft: 10,
                    topRight: 10,
                  }}
                  color={
                    chartData.find((data) => data.browser === point.xValue)
                      ?.color
                  }
                />
              );
            });
          }}
        </CartesianChart>
      </CardContent>

      <CardFooter className="flex-col items-start">
        <View className="flex-row items-center gap-2">
          <Text className="font-sans-medium text-sm">
            {t("chart.trending")}
          </Text>
          <Icons.TrendingUp size={16} className="text-foreground" />
        </View>
        <Text className="text-muted-foreground text-sm">
          {t("chart.showing")}
        </Text>
      </CardFooter>
    </Card>
  );
}
