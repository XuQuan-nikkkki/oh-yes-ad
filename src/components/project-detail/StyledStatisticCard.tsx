import { type ComponentProps } from "react";
import { StatisticCard } from "@ant-design/pro-components";

const statisticCardStyle = { background: "#F5F4EE", borderRadius: 12 } as const;

type Props = {
  statistic: ComponentProps<typeof StatisticCard>["statistic"];
};

const StyledStatisticCard = ({ statistic }: Props) => (
  <StatisticCard style={statisticCardStyle} statistic={statistic} />
);

export default StyledStatisticCard;
