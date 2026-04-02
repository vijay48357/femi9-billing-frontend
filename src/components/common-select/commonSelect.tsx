import React, { useEffect, useState } from "react";
import Select from "react-select";

export type Option = {
  value: string;
  label: string;
};

export interface SelectProps {
  options: Option[];
  defaultValue?: Option;
  className?: string;
  styles?: any;
  onChange?: (value: string) => void;
}

const customComponents = {
  IndicatorSeparator: () => null,
};

const CommonSelect: React.FC<SelectProps> = ({ options, defaultValue, className, onChange }) => {
  const [selectedOption, setSelectedOption] = useState<Option | undefined>(defaultValue);

  const customStyles = {
    option: (base: any, state: any) => ({
      ...base,
      backgroundColor: state.isSelected
        ? "#E41F07"
        : state.isFocused
          ? "#white" // optional: different hover bg if not selected
          : "white",
      color: state.isSelected
        ? "#fff"
        : state.isFocused
          ? "#E41F07"
          : "#707070",
      cursor: "pointer",
      "&:hover": {
        backgroundColor: "#E41F07", // lighter hover effect (or keep same as focused)
        color: state.isSelected ? "white" : "#fff",
      },
    }),
  };


  const handleChange = (option: Option | null) => {
    setSelectedOption(option || undefined);
    if (onChange && option) {
      onChange(option.value);
    }
  };
  useEffect(() => {
    setSelectedOption(defaultValue || undefined);
  }, [defaultValue])

  return (
    <div className="common-select">
      <Select
        classNamePrefix="react-select"
        className={className}
        styles={customStyles}
        options={options}
        value={selectedOption}
        onChange={handleChange}
        components={customComponents}
        placeholder="Select"
      />
    </div>
  );
};

export default CommonSelect;
