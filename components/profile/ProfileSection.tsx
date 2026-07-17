"use client";

import { useState } from "react";
import type { Occupation, Gender } from "@prisma/client";
import { ProfileDetailsCard } from "./ProfileDetailsCard";
import { ProfileForm } from "./ProfileForm";
import { formatDateOfBirthForInput } from "@/services/profile";

type ProfileSectionProps = {
  name: string | null;
  email: string;
  fatherName: string | null;
  dateOfBirth: Date | null;
  occupation: Occupation | null;
  address: string | null;
  whatsapp: string | null;
  image: string | null;
  gender: Gender | null;
  registrationNumber?: string | null;
};

export function ProfileSection({
  name,
  email,
  fatherName,
  dateOfBirth,
  occupation,
  address,
  whatsapp,
  image,
  gender,
  registrationNumber,
}: ProfileSectionProps) {
  const [isEditing, setIsEditing] = useState(false);

  if (isEditing) {
    return (
      <ProfileForm
        name={name}
        email={email}
        fatherName={fatherName}
        dateOfBirth={formatDateOfBirthForInput(dateOfBirth)}
        occupation={occupation}
        address={address}
        whatsapp={whatsapp}
        image={image}
        gender={gender}
        onCancel={() => setIsEditing(false)}
      />
    );
  }

  return (
    <ProfileDetailsCard
      name={name}
      email={email}
      fatherName={fatherName}
      dateOfBirth={dateOfBirth}
      occupation={occupation}
      address={address}
      whatsapp={whatsapp}
      image={image}
      gender={gender}
      registrationNumber={registrationNumber}
      onEdit={() => setIsEditing(true)}
    />
  );
}
