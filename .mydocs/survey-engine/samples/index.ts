// Survey samples - from simple to complex
export { simpleFeedbackSurvey } from './01-simple-feedback';
export { npsSurvey } from './02-nps-survey';
export { productSatisfactionSurvey } from './03-product-satisfaction';
export { employeeEngagementSurvey } from './04-employee-engagement';
export { eventRegistrationSurvey } from './05-event-registration';
export { medicalIntakeSurvey } from './06-medical-intake';
export { marketResearchSurvey } from './07-market-research';
export { jobApplicationSurvey } from './08-job-application';
export { realEstateInquirySurvey } from './09-real-estate-inquiry';
export { customerJourneySurvey } from './10-customer-journey';

// All samples as array for iteration
import { simpleFeedbackSurvey } from './01-simple-feedback';
import { npsSurvey } from './02-nps-survey';
import { productSatisfactionSurvey } from './03-product-satisfaction';
import { employeeEngagementSurvey } from './04-employee-engagement';
import { eventRegistrationSurvey } from './05-event-registration';
import { medicalIntakeSurvey } from './06-medical-intake';
import { marketResearchSurvey } from './07-market-research';
import { jobApplicationSurvey } from './08-job-application';
import { realEstateInquirySurvey } from './09-real-estate-inquiry';
import { customerJourneySurvey } from './10-customer-journey';

export const allSamples = [
  { name: 'Simple Feedback', complexity: 'simple', branching: false, survey: simpleFeedbackSurvey },
  { name: 'NPS Survey', complexity: 'simple', branching: true, survey: npsSurvey },
  { name: 'Product Satisfaction', complexity: 'medium', branching: false, survey: productSatisfactionSurvey },
  { name: 'Employee Engagement', complexity: 'medium', branching: false, survey: employeeEngagementSurvey },
  { name: 'Event Registration', complexity: 'medium', branching: true, survey: eventRegistrationSurvey },
  { name: 'Medical Intake', complexity: 'medium', branching: true, survey: medicalIntakeSurvey },
  { name: 'Market Research', complexity: 'complex', branching: true, survey: marketResearchSurvey },
  { name: 'Job Application', complexity: 'complex', branching: true, survey: jobApplicationSurvey },
  { name: 'Real Estate Inquiry', complexity: 'complex', branching: true, survey: realEstateInquirySurvey },
  { name: 'Customer Journey', complexity: 'complex', branching: true, survey: customerJourneySurvey },
] as const;
