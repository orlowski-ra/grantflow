// SF-424 Form Template - US Federal Grant Forms
// Common fields for NSF, NIH, DOE grants

import { FormTemplate } from '../form-filler/template-engine'

export const SF424_TEMPLATE: FormTemplate = {
  source: 'US_FEDERAL',
  formType: 'sf424_rr',
  fieldMappings: {
    // Applicant Information
    'Applicant_1_Name': 'companyName',
    'Applicant_2_EIN': 'taxId',
    'Applicant_3_DUNS': 'duns',
    'Applicant_4_Address': 'street',
    'Applicant_5_City': 'city',
    'Applicant_6_State': 'state',
    'Applicant_7_Zip': 'postalCode',
    'Applicant_8_Country': 'country',
    
    // Contact Person
    'Contact_1_Name': 'representativeName',
    'Contact_2_Title': 'representativePosition',
    'Contact_3_Phone': 'phone',
    'Contact_4_Email': 'email',
    'Contact_5_Fax': 'fax',
    
    // Project Information
    'Project_1_Title': 'projectTitle',
    'Project_2_StartDate': 'projectStartDate',
    'Project_3_EndDate': 'projectEndDate',
    'Project_4_Duration': 'projectDuration',
    
    // Congressional Districts
    'Congressional_1_Applicant': 'congressionalDistrictApplicant',
    'Congressional_2_Project': 'congressionalDistrictProject',
  },
  staticValues: {
    'Country': 'USA',
    'Submission_Type': 'Application',
    'Application_Type': 'New',
    'Type_of_Applicant': '1', // 1 = Small Business
  },
  calculatedFields: {
    'Date_Submitted': () => new Date().toISOString().split('T')[0],
    'Federal_Entity_Identifier': () => '', // Leave empty for new applications
    'Applicant_ID': (data: any) => data.ein || data.duns || '',
    'Project_Duration_Months': (data: any) => {
      if (data.projectStartDate && data.projectEndDate) {
        const start = new Date(data.projectStartDate)
        const end = new Date(data.projectEndDate)
        const months = (end.getFullYear() - start.getFullYear()) * 12 + 
                      (end.getMonth() - start.getMonth())
        return months.toString()
      }
      return ''
    }
  }
}

// NSF-specific template extensions
export const NSF_PROJECT_DESCRIPTION_TEMPLATE: FormTemplate = {
  source: 'NSF',
  formType: 'project_summary',
  fieldMappings: {
    'Overview': 'projectOverview',
    'Intellectual_Merit': 'intellectualMerit',
    'Broader_Impacts': 'broaderImpacts',
  },
  calculatedFields: {
    'PI_Name': (data: any) => data.representativeName || '',
    'CoPI_Count': (data: any) => data.coInvestigators?.length?.toString() || '0',
  }
}

// NIH-specific template
export const NIH_TEMPLATE: FormTemplate = {
  source: 'NIH',
  formType: 'sf424_rr',
  fieldMappings: {
    ...SF424_TEMPLATE.fieldMappings,
    'NIH_1_ORCID': 'orcidId',
    'NIH_2_HHS_ID': 'hhsId',
    'NIH_3_Citizenship': 'citizenship',
    'NIH_4_Ethnicity': 'ethnicity',
    'NIH_5_Race': 'race',
    'NIH_6_Gender': 'gender',
    'NIH_7_Disabled': 'disabled',
    'NIH_8_Veteran': 'veteranStatus',
  },
  staticValues: {
    ...SF424_TEMPLATE.staticValues,
    'FOA_Number': '', // To be filled
    'Activity_Code': '', // To be filled
    'Administering_IC': '', // To be filled
  }
}

// SBIR/STTR specific
export const SBIR_TEMPLATE: FormTemplate = {
  source: 'SBA_SBIR',
  formType: 'phase1_proposal',
  fieldMappings: {
    'Company_Name': 'companyName',
    'Company_Size': 'companySizeCategory',
    'Women_Owned': 'womenOwned',
    'Socially_Disadvantaged': 'sociallyDisadvantaged',
    'HubZone': 'hubZone',
    'Principal_Investigator': 'representativeName',
    'PI_Email': 'email',
    'PI_Phone': 'phone',
    'Project_Title': 'projectTitle',
    'Technical_Abstract': 'technicalAbstract',
    'Lay_Abstract': 'layAbstract',
  },
  calculatedFields: {
    'Phase': () => '1',
    'Topic_Number': () => '', // To be filled
    'Subtopic_Letter': () => '', // To be filled
    'Company_Age_Years': (data: any) => {
      if (data.foundingYear) {
        return (new Date().getFullYear() - data.foundingYear).toString()
      }
      return ''
    },
    'Employee_Count': (data: any) => data.employeeCount?.toString() || '',
  }
}

// Field validation rules for SF-424
export const SF424_VALIDATION_RULES = {
  requiredFields: [
    'Applicant_1_Name',
    'Applicant_4_Address',
    'Contact_1_Name',
    'Contact_4_Email',
    'Project_1_Title',
  ],
  
  fieldFormats: {
    'Applicant_2_EIN': /^\d{2}-?\d{7}$/, // XX-XXXXXXX
    'Applicant_3_DUNS': /^\d{9}$/, // 9 digits
    'Applicant_7_Zip': /^\d{5}(-\d{4})?$/, // 12345 or 12345-6789
    'Contact_4_Email': /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    'Contact_3_Phone': /^[\d\s\-\(\)\+]{10,}$/,
  },
  
  valueConstraints: {
    'Project_3_EndDate': {
      after: 'Project_2_StartDate',
      maxDuration: 60, // months
    },
    'Project_4_Duration': {
      min: 1,
      max: 60,
    }
  }
}

// Export all federal templates
export const FEDERAL_TEMPLATES = [
  SF424_TEMPLATE,
  NSF_PROJECT_DESCRIPTION_TEMPLATE,
  NIH_TEMPLATE,
  SBIR_TEMPLATE,
]
