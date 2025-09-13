import React, { useState, useEffect, useCallback } from 'react';
import { Input, AutoComplete, Spin } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import { debounce } from 'lodash';

interface SearchOption {
  value: string;
  label: string;
  category?: string;
}

interface SmartSearchProps {
  placeholder?: string;
  onSearch: (value: string) => void;
  onSelect?: (value: string, option: SearchOption) => void;
  fetchSuggestions?: (query: string) => Promise<SearchOption[]>;
  allowClear?: boolean;
  size?: 'small' | 'middle' | 'large';
  style?: React.CSSProperties;
}

const SmartSearch: React.FC<SmartSearchProps> = ({
  placeholder = '搜索...',
  onSearch,
  onSelect,
  fetchSuggestions,
  allowClear = true,
  size = 'middle',
  style
}) => {
  const [options, setOptions] = useState<SearchOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [value, setValue] = useState('');

  // 防抖搜索建议
  const debouncedFetchSuggestions = useCallback(
    debounce(async (query: string) => {
      if (!fetchSuggestions || !query.trim()) {
        setOptions([]);
        return;
      }

      setLoading(true);
      try {
        const suggestions = await fetchSuggestions(query);
        setOptions(suggestions);
      } catch (error) {
        console.error('获取搜索建议失败:', error);
        setOptions([]);
      } finally {
        setLoading(false);
      }
    }, 300),
    [fetchSuggestions]
  );

  useEffect(() => {
    debouncedFetchSuggestions(value);
  }, [value, debouncedFetchSuggestions]);

  const handleSearch = (searchValue: string) => {
    onSearch(searchValue);
  };

  const handleSelect = (selectedValue: string, option: any) => {
    setValue(selectedValue);
    if (onSelect) {
      onSelect(selectedValue, option);
    }
    onSearch(selectedValue);
  };

  const handleChange = (newValue: string) => {
    setValue(newValue);
  };

  // 按类别分组选项
  const groupedOptions = options.reduce((acc, option) => {
    const category = option.category || '默认';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(option);
    return acc;
  }, {} as Record<string, SearchOption[]>);

  const autoCompleteOptions = Object.keys(groupedOptions).map(category => ({
    label: category,
    options: groupedOptions[category].map(option => ({
      value: option.value,
      label: option.label,
    }))
  }));

  return (
    <AutoComplete
      value={value}
      options={fetchSuggestions ? autoCompleteOptions : undefined}
      onSelect={handleSelect}
      onChange={handleChange}
      style={style}
      notFoundContent={loading ? <Spin size="small" /> : null}
    >
      <Input.Search
        placeholder={placeholder}
        allowClear={allowClear}
        onSearch={handleSearch}
        size={size}
        prefix={<SearchOutlined />}
        loading={loading}
      />
    </AutoComplete>
  );
};

export default SmartSearch;