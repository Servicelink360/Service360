/**
 * Avoid circular import: induction route loads TrainingPage with kind=INDUCTION.
 */
import React from 'react';
import TrainingPage from './TrainingLearner';

const InductionPage: React.FC = () => <TrainingPage kind="INDUCTION" />;

export default InductionPage;
