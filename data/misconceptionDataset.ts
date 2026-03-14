import { GroundingSource } from '../types';

export interface MisconceptionEntry {
  id: string;
  topic: string;
  misconception: string;
  whyItHappens: string;
  diagnosticQuestion: string;
  remediation: string;
  keywords: string[];
  sources: GroundingSource[];
}

export const misconceptionDataset: MisconceptionEntry[] = [
  {
    id: 'thermo-entropy-1',
    topic: 'Entropy and Disorder',
    misconception: 'Entropy always means visible mess or disorder in every context.',
    whyItHappens: 'Students overgeneralize a metaphor and miss microstate-based reasoning.',
    diagnosticQuestion: 'Can a system become more ordered locally while total entropy still increases?',
    remediation: 'Teach entropy through energy dispersal and multiplicity, then use system + surroundings accounting.',
    keywords: ['entropy', 'disorder', 'microstates', 'thermodynamics', 'second law', 'energy dispersal'],
    sources: [
      { uri: 'https://openstax.org/books/chemistry-2e/pages/16-3-the-second-and-third-laws-of-thermodynamics', title: 'OpenStax Chemistry 2e: Second and Third Laws' },
      { uri: 'https://chem.libretexts.org/Bookshelves/Physical_and_Theoretical_Chemistry_Textbook_Maps/Thermodynamics_and_Chemical_Equilibrium_(Ellgen)/18%3A_Entropy_and_Second_Law/18.01%3A_The_Concept_of_Entropy', title: 'LibreTexts: The Concept of Entropy' }
    ]
  },
  {
    id: 'thermo-heat-temp-1',
    topic: 'Heat vs Temperature',
    misconception: 'Heat and temperature are the same quantity.',
    whyItHappens: 'Everyday language uses them interchangeably and hides unit differences.',
    diagnosticQuestion: 'Why can a large bucket of warm water contain more thermal energy than a cup of boiling water?',
    remediation: 'Contrast intensive vs extensive properties and use particle-level models with examples.',
    keywords: ['heat', 'temperature', 'thermal energy', 'specific heat', 'intensive', 'extensive'],
    sources: [
      { uri: 'https://openstax.org/books/physics/pages/13-2-temperature-and-kinetic-theory', title: 'OpenStax Physics: Temperature and Kinetic Theory' },
      { uri: 'https://www.khanacademy.org/science/physics/thermodynamics', title: 'Khan Academy: Thermodynamics Overview' }
    ]
  },
  {
    id: 'thermo-spontaneity-1',
    topic: 'Spontaneity',
    misconception: 'Spontaneous means fast, explosive, or always exothermic.',
    whyItHappens: 'Students conflate kinetics and thermodynamics while solving reaction problems.',
    diagnosticQuestion: 'Can a spontaneous reaction proceed very slowly at room temperature?',
    remediation: 'Separate delta G from rate laws and use paired examples that are thermodynamically favorable but kinetically slow.',
    keywords: ['spontaneous', 'gibbs', 'delta g', 'kinetics', 'thermodynamics', 'exothermic'],
    sources: [
      { uri: 'https://openstax.org/books/chemistry-2e/pages/16-4-free-energy', title: 'OpenStax Chemistry 2e: Free Energy' },
      { uri: 'https://www.nist.gov/', title: 'NIST Education and Measurement Resources' }
    ]
  },
  {
    id: 'thermo-equilibrium-1',
    topic: 'Equilibrium',
    misconception: 'At equilibrium, reactions stop completely.',
    whyItHappens: 'The term static equilibrium is misread as no molecular activity.',
    diagnosticQuestion: 'What does dynamic equilibrium mean at the molecular level?',
    remediation: 'Use forward and reverse rate visualizations and concentration-time plots.',
    keywords: ['equilibrium', 'dynamic equilibrium', 'forward rate', 'reverse rate', 'reaction quotient'],
    sources: [
      { uri: 'https://openstax.org/books/chemistry-2e/pages/15-introduction', title: 'OpenStax Chemistry 2e: Chemical Equilibrium' },
      { uri: 'https://phet.colorado.edu/en/simulations/filter?subjects=chemistry', title: 'PhET Chemistry Simulations' }
    ]
  }
];
