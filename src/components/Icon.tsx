type IconProps = {
  className: string | string[];
  text?: string;
};
export function Icon(props: IconProps) {
  const cn = Array.isArray(props.className)
    ? props.className.join(" ")
    : props.className;
  return (
    <>
      <span class={cn} />
      {props.text && props.text}
    </>
  );
}
/* "# The pride of your heart has deceived you

The "heart" was associated with emotions. The Edomites' pride caused them to be deceived about their security. Alternate translation: "Your pride has deceived you" or "Your pride causes you think you are safe" 

# in the clefts of the rock

“in the gaps in the rock" or "in rock caves"

# say in your heart

"say to yourselves" or "think" 

# Who will bring me down to the ground?

"No one can bring me down to the ground." or "I am safe from all attackers." 

" */
