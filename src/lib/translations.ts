export type Language = 'en' | 'fr';

export const sharedUi = {
  skipLink: {
    en: 'Skip to main content',
    fr: 'Aller au contenu principal',
  },
  footer: {
    en: {
      blurb: 'A community-first referral initiative helping newcomers connect with hiring teams in Canada.',
      resourcesLabel: 'Resources',
      privacy: 'Privacy',
      terms: 'Terms',
      contact: 'Contact',
      contactLabel: 'Contact',
      meta: 'For questions or data requests, reach out anytime.',
    },
    fr: {
      blurb:
        "Une initiative communautaire de recommandation qui aide les nouveaux arrivants à se connecter aux équipes de recrutement au Canada.",
      resourcesLabel: 'Ressources',
      privacy: 'Confidentialité',
      terms: 'Conditions',
      contact: 'Contact',
      contactLabel: 'Contact',
      meta: "Pour toute question ou demande de données, n'hésitez pas à nous écrire.",
    },
  },
};

export const formMessages = {
  applicant: {
    en: {
      statusMessages: {
        ok: "We've received your request. We'll follow up by email soon.",
        error: "We couldn't send your request right now. Please try again in a moment.",
      },
      validation: {
        firstName: 'Please enter your first name.',
        familyName: 'Please enter your family name.',
        emailRequired: 'Please enter your email address.',
        emailInvalid: 'Please enter a valid email address.',
        phoneRequired: 'Please enter your phone number.',
        locatedCanadaRequired: 'Please select your current location status.',
        provinceRequired: 'Please select your province.',
        authorizedCanadaRequired: 'Please confirm your work authorization.',
        eligibleMoveCanadaRequired:
          'Please confirm if you can move and work in Canada in the next 6 months.',
        industryTypeRequired: 'Please select an industry type.',
        industryOtherRequired: 'Please specify the other industry type.',
        employmentStatusRequired: 'Please select your employment status.',
        languagesRequired: 'Please select at least one language.',
        languagesOtherRequired: 'Please specify the other language.',
        countryOfOriginRequired: 'Please select your country of origin.',
        linkedinInvalid: 'Please enter a valid LinkedIn profile URL.',
        resumeRequired: 'Please upload your resume / CV.',
        resumeInvalid: 'Please upload a PDF or DOC/DOCX file under 10MB.',
      },
      errors: {
        prefillLoadFailed: 'Failed to load your existing data',
        submitFailed: 'Something went wrong. Please try again.',
      },
    },
    fr: {
      statusMessages: {
        ok: 'Nous avons bien reçu votre demande. Nous vous contacterons bientôt par e-mail.',
        error: "Nous ne pouvons pas envoyer votre demande pour l'instant. Veuillez réessayer dans un moment.",
      },
      validation: {
        firstName: 'Veuillez entrer votre prénom.',
        familyName: 'Veuillez entrer votre nom de famille.',
        emailRequired: 'Veuillez entrer votre adresse courriel.',
        emailInvalid: 'Veuillez entrer une adresse courriel valide.',
        phoneRequired: 'Veuillez entrer votre numéro de téléphone.',
        locatedCanadaRequired: 'Veuillez indiquer votre situation de localisation actuelle.',
        provinceRequired: 'Veuillez sélectionner votre province.',
        authorizedCanadaRequired: 'Veuillez confirmer votre autorisation de travail.',
        eligibleMoveCanadaRequired:
          'Veuillez confirmer si vous pouvez vous installer et travailler au Canada dans les 6 prochains mois.',
        industryTypeRequired: "Veuillez sélectionner un secteur d'activité.",
        industryOtherRequired: "Veuillez préciser l'autre secteur d'activité.",
        employmentStatusRequired: "Veuillez sélectionner votre statut d'emploi.",
        languagesRequired: 'Veuillez sélectionner au moins une langue.',
        languagesOtherRequired: "Veuillez préciser l'autre langue.",
        countryOfOriginRequired: 'Veuillez sélectionner votre pays d’origine.',
        linkedinInvalid: 'Veuillez entrer une URL de profil LinkedIn valide.',
        resumeRequired: 'Veuillez téléverser votre CV.',
        resumeInvalid: 'Veuillez téléverser un fichier PDF ou DOC/DOCX de moins de 10 Mo.',
      },
      errors: {
        prefillLoadFailed: 'Impossible de charger vos informations existantes',
        submitFailed: "Une erreur s'est produite. Veuillez réessayer.",
      },
    },
  },
  referrer: {
    en: {
      statusMessages: {
        ok: "We've received your details. We'll reach out when there's an applicant match.",
        okExisting: "We've received your submission. Our admin team will review any updates and be in touch.",
        error: "We couldn't send your details right now. Please try again in a moment.",
      },
      validation: {
        nameRequired: 'Please enter your name.',
        emailRequired: 'Please enter your work email.',
        emailInvalid: 'Please enter a valid email address.',
        companyIndustryRequired: 'Please select the company industry.',
        companyIndustryOtherRequired: 'Please specify the company industry.',
        workTypeRequired: 'Please select a work type.',
        phoneRequired: 'Please enter your phone number.',
        countryRequired: 'Please select your country of origin.',
        careersPortalRequired: 'Please enter the careers portal URL.',
        careersPortalInvalid: 'Please enter a valid URL (http/https).',
        linkedinInvalid: 'Please enter a valid LinkedIn profile URL.',
      },
      errors: {
        submissionFailed: 'Submission failed',
      },
    },
    fr: {
      statusMessages: {
        ok: "Nous avons bien reçu vos informations. Nous vous contacterons lorsqu'un candidat correspondra.",
        okExisting:
          "Nous avons reçu votre soumission. Notre équipe d'administration examinera toute mise à jour et vous contactera.",
        error: "Impossible d'envoyer vos informations pour l'instant. Veuillez réessayer dans un instant.",
      },
      validation: {
        nameRequired: 'Veuillez entrer votre nom.',
        emailRequired: 'Veuillez entrer votre courriel professionnel.',
        emailInvalid: 'Veuillez entrer une adresse courriel valide.',
        companyIndustryRequired: "Veuillez sélectionner le secteur de l'entreprise.",
        companyIndustryOtherRequired: "Veuillez préciser le secteur de l'entreprise.",
        workTypeRequired: 'Veuillez sélectionner un type de travail.',
        phoneRequired: 'Veuillez entrer votre numéro de téléphone.',
        countryRequired: 'Veuillez sélectionner votre pays d’origine.',
        careersPortalRequired: "Veuillez entrer l'URL du portail carrières.",
        careersPortalInvalid: 'Veuillez entrer une URL valide (http/https).',
        linkedinInvalid: 'Veuillez entrer une URL de profil LinkedIn valide.',
      },
      errors: {
        submissionFailed: "Échec de l'envoi",
      },
    },
  },
  apply: {
    en: {
      statusMessages: {
        ok: "Application submitted. We'll log it and follow up with next steps.",
        error: 'Something went wrong. Please try again.',
        networkError: 'Unable to connect. Please check your internet connection and try again.',
      },
      validation: {
        applicantId: 'Please enter your iRAIN or legacy CAND ID.',
        applicantKey: 'Please enter your Applicant Key.',
        iCrn: 'Please enter the iRCRN.',
        position: 'Please enter the position you are applying for.',
        resume: 'Please upload your resume (PDF or DOC/DOCX under 10MB).',
        resumeInvalid: 'Please upload a PDF or DOC/DOCX file under 10MB.',
      },
      errors: {
        submitFailed: 'Something went wrong.',
      },
    },
    fr: {
      statusMessages: {
        ok: "Candidature soumise. Nous l'enregistrerons et vous contacterons pour les prochaines étapes.",
        error: "Une erreur s'est produite. Veuillez réessayer.",
        networkError:
          'Connexion impossible. Veuillez vérifier votre connexion internet et réessayer.',
      },
      validation: {
        applicantId: 'Veuillez entrer votre iRAIN ou ancien CAND ID.',
        applicantKey: 'Veuillez entrer votre clé de candidat.',
        iCrn: "Veuillez entrer l'iRCRN.",
        position: 'Veuillez entrer le poste pour lequel vous postulez.',
        resume: 'Veuillez téléverser votre CV (PDF ou DOC/DOCX moins de 10 Mo).',
        resumeInvalid: 'Veuillez téléverser un fichier PDF ou DOC/DOCX de moins de 10 Mo.',
      },
      errors: {
        submitFailed: "Une erreur s'est produite.",
      },
    },
  },
  updateCv: {
    en: {
      errors: {
        missingLink:
          'This update link is missing required information. Please use the link from your email.',
        loadError: 'Unable to load application details.',
        unableToLoad: 'Unable to Load',
        errorHint: 'If you need assistance, please contact your referrer or iRefair support.',
        submitFailed: 'Something went wrong.',
        networkError: 'A network error occurred. Please try again.',
      },
      validation: {
        invalidFile: 'Please upload a PDF or DOC/DOCX file under 10MB.',
        resumeRequired: 'Please upload your updated CV.',
      },
    },
    fr: {
      errors: {
        missingLink:
          "Ce lien de mise à jour manque d'informations requises. Veuillez utiliser le lien de votre courriel.",
        loadError: 'Impossible de charger les détails de la candidature.',
        unableToLoad: 'Impossible de charger',
        errorHint: "Si vous avez besoin d'aide, veuillez contacter votre référent ou le support iRefair.",
        submitFailed: "Une erreur s'est produite.",
        networkError: "Une erreur réseau s'est produite. Veuillez réessayer.",
      },
      validation: {
        invalidFile: 'Veuillez téléverser un fichier PDF ou DOC/DOCX de moins de 10 Mo.',
        resumeRequired: 'Veuillez téléverser votre CV mis à jour.',
      },
    },
  },
  reschedule: {
    en: {
      errors: {
        missingLink:
          'This reschedule link is missing required information. Please use the link from your email.',
        invalidLink: 'This reschedule link is invalid or has expired.',
        validationError: 'Unable to validate the reschedule link. Please try again.',
        unableToReschedule: 'Unable to Reschedule',
        errorHint: 'If you need assistance, please contact the recruiter directly.',
        submitError: 'Something went wrong. Please try again.',
        submitNetworkError: 'Unable to submit reschedule request. Please try again.',
      },
    },
    fr: {
      errors: {
        missingLink:
          "Ce lien de reprogrammation manque d'informations requises. Veuillez utiliser le lien de votre courriel.",
        invalidLink: 'Ce lien de reprogrammation est invalide ou a expiré.',
        validationError: 'Impossible de valider le lien de reprogrammation. Veuillez réessayer.',
        unableToReschedule: 'Impossible de reprogrammer',
        errorHint: "Si vous avez besoin d'aide, veuillez contacter le recruteur directement.",
        submitError: "Une erreur s'est produite. Veuillez réessayer.",
        submitNetworkError:
          'Impossible de soumettre la demande de reprogrammation. Veuillez réessayer.',
      },
    },
  },
  login: {
    en: {
      validation: {
        emailRequired: 'Please enter your email.',
        emailInvalid: 'Enter a valid email address.',
        passwordRequired: 'Please enter your password.',
      },
      errors: {
        signInError: 'Unable to sign in. Please check your details.',
        signInErrorGeneric: 'Unable to sign in right now. Please try again.',
      },
    },
    fr: {
      validation: {
        emailRequired: 'Veuillez entrer votre courriel.',
        emailInvalid: 'Entrez une adresse courriel valide.',
        passwordRequired: 'Veuillez entrer votre mot de passe.',
      },
      errors: {
        signInError: 'Connexion impossible. Veuillez vérifier vos informations.',
        signInErrorGeneric: 'Connexion impossible pour le moment. Veuillez réessayer.',
      },
    },
  },
};
