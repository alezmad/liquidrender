import { withI18n } from "@turbostarter/i18n/with-i18n";

import {
  Hero,
  HowItWorks,
  ThreeModes,
  CompetitorMap,
  LearningJourney,
  VocabularySection,
  FinalCta,
} from "~/modules/marketing/knosia";

const HomePage = () => {
  return (
    <>
      <Hero />
      <HowItWorks />
      <ThreeModes />
      <CompetitorMap />
      <LearningJourney />
      <VocabularySection />
      <FinalCta />
    </>
  );
};

export default withI18n(HomePage);
