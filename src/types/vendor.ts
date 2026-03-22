export type VendorSelectOption = {
  id: string;
  value: string;
  color?: string | null;
};

export type Vendor = {
  id: string;
  name: string;
  fullName?: string | null;
  vendorTypeOptionId?: string | null;
  businessTypeOptionIds?: string[];
  businessTypeOptionId?: string | null;
  cooperationStatusOptionId?: string | null;
  ratingOptionId?: string | null;
  serviceOptionIds?: string[];
  vendorTypeOption?: VendorSelectOption | null;
  businessTypeOption?: VendorSelectOption | null;
  businessTypeOptions?: VendorSelectOption[];
  cooperationStatusOption?: VendorSelectOption | null;
  ratingOption?: VendorSelectOption | null;
  serviceOptions?: VendorSelectOption[];
  location?: string | null;
  contactName?: string | null;
  phone?: string | null;
  email?: string | null;
  wechat?: string | null;
  strengths?: string | null;
  notes?: string | null;
  companyIntro?: string | null;
  portfolioLink?: string | null;
  priceRange?: string | null;
  isBlacklisted?: boolean;
  lastCoopDate?: string | null;
  cooperatedProjects?: string | null;
  milestones?: {
    id: string;
    name: string;
  }[];
};
