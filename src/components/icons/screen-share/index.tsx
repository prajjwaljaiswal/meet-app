import { IconProps } from "../types"

interface IScreenShareIconProps extends IconProps {
  active?: boolean
}

export const ScreenShareIcon = (props: IScreenShareIconProps) => {
  const { active, width = 24, height = 24, color, ...rest } = props
  const fillColor = active ? (color || "#1890ff") : (color || "#8c8c8c")

  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...rest}
    >
      <path
        d="M20 18c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2H4c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h6v2H8v2h8v-2h-2v-2h6zm0-12H4v10h16V6z"
        fill={fillColor}
      />
      <path
        d="M13 10.5l-2-2v1.5H7v2h4v1.5l2-2z"
        fill={fillColor}
      />
    </svg>
  )
}

