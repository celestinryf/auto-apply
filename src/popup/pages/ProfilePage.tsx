import { signal } from '@preact/signals';
import { useEffect } from 'preact/hooks';
import type { UserProfile, WorkExperience, Education, Language } from '@/shared/types';
import { createDefaultProfile } from '@/shared/types';
import { getProfile, saveProfile } from '@/storage/index';
import { ResumeUpload } from '../components/ResumeUpload';

const profile = signal<UserProfile>(createDefaultProfile());
const status = signal<{ type: 'success' | 'error'; message: string } | null>(null);
const loading = signal(true);

function generateId(): string {
  return Math.random().toString(36).substring(2, 9);
}

export function ProfilePage() {
  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    try {
      const loaded = await getProfile();
      profile.value = loaded;
    } catch (err) {
      console.error('Failed to load profile:', err);
    } finally {
      loading.value = false;
    }
  }

  async function handleSave() {
    try {
      await saveProfile(profile.value);
      status.value = { type: 'success', message: 'Profile saved!' };
      setTimeout(() => (status.value = null), 2000);
    } catch (err) {
      status.value = { type: 'error', message: 'Failed to save profile' };
    }
  }

  function updatePersonal(field: string, value: string) {
    profile.value = {
      ...profile.value,
      personal: { ...profile.value.personal, [field]: value },
    };
  }

  function updateLocation(field: string, value: string) {
    profile.value = {
      ...profile.value,
      personal: {
        ...profile.value.personal,
        location: { ...profile.value.personal.location, [field]: value },
      },
    };
  }

  function updatePreference(field: string, value: string | boolean) {
    profile.value = {
      ...profile.value,
      preferences: { ...profile.value.preferences, [field]: value },
    };
  }

  // Work experience
  function addWork() {
    profile.value = {
      ...profile.value,
      work: [
        ...profile.value.work,
        {
          id: generateId(),
          company: '',
          title: '',
          startDate: '',
          endDate: '',
          current: false,
          description: '',
          highlights: [],
        },
      ],
    };
  }

  function updateWork(index: number, field: keyof WorkExperience, value: unknown) {
    const work = [...profile.value.work];
    work[index] = { ...work[index], [field]: value };
    profile.value = { ...profile.value, work };
  }

  function removeWork(index: number) {
    profile.value = {
      ...profile.value,
      work: profile.value.work.filter((_, i) => i !== index),
    };
  }

  // Education
  function addEducation() {
    profile.value = {
      ...profile.value,
      education: [
        ...profile.value.education,
        {
          id: generateId(),
          school: '',
          degree: '',
          field: '',
          startDate: '',
          endDate: '',
        },
      ],
    };
  }

  function updateEducation(index: number, field: keyof Education, value: string) {
    const education = [...profile.value.education];
    education[index] = { ...education[index], [field]: value };
    profile.value = { ...profile.value, education };
  }

  function removeEducation(index: number) {
    profile.value = {
      ...profile.value,
      education: profile.value.education.filter((_, i) => i !== index),
    };
  }

  // Skills
  function addSkill(e: KeyboardEvent) {
    if (e.key !== 'Enter') return;
    const input = e.target as HTMLInputElement;
    const skill = input.value.trim();
    if (skill && !profile.value.skills.includes(skill)) {
      profile.value = {
        ...profile.value,
        skills: [...profile.value.skills, skill],
      };
      input.value = '';
    }
  }

  function removeSkill(skill: string) {
    profile.value = {
      ...profile.value,
      skills: profile.value.skills.filter((s) => s !== skill),
    };
  }

  // Languages
  function addLanguage() {
    profile.value = {
      ...profile.value,
      languages: [...profile.value.languages, { language: '', proficiency: '' }],
    };
  }

  function updateLanguage(index: number, field: keyof Language, value: string) {
    const languages = [...profile.value.languages];
    languages[index] = { ...languages[index], [field]: value };
    profile.value = { ...profile.value, languages };
  }

  function removeLanguage(index: number) {
    profile.value = {
      ...profile.value,
      languages: profile.value.languages.filter((_, i) => i !== index),
    };
  }

  function handleResumeProfile(parsed: UserProfile) {
    profile.value = { ...parsed, updatedAt: Date.now() };
    status.value = { type: 'success', message: 'Resume parsed! Review and save.' };
    setTimeout(() => (status.value = null), 3000);
  }

  if (loading.value) {
    return <div class="page">Loading...</div>;
  }

  const p = profile.value;

  return (
    <div class="page">
      {status.value && (
        <div class={`status-bar status-${status.value.type}`}>{status.value.message}</div>
      )}

      <ResumeUpload onParsed={handleResumeProfile} />

      {/* Personal Info */}
      <div class="form-section">
        <div class="form-section-title">Personal Information</div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">First Name</label>
            <input
              class="form-input"
              value={p.personal.firstName}
              onInput={(e) => updatePersonal('firstName', (e.target as HTMLInputElement).value)}
            />
          </div>
          <div class="form-group">
            <label class="form-label">Last Name</label>
            <input
              class="form-input"
              value={p.personal.lastName}
              onInput={(e) => updatePersonal('lastName', (e.target as HTMLInputElement).value)}
            />
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Email</label>
          <input
            class="form-input"
            type="email"
            value={p.personal.email}
            onInput={(e) => updatePersonal('email', (e.target as HTMLInputElement).value)}
          />
        </div>
        <div class="form-group">
          <label class="form-label">Phone</label>
          <input
            class="form-input"
            type="tel"
            value={p.personal.phone}
            onInput={(e) => updatePersonal('phone', (e.target as HTMLInputElement).value)}
          />
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">City</label>
            <input
              class="form-input"
              value={p.personal.location.city}
              onInput={(e) => updateLocation('city', (e.target as HTMLInputElement).value)}
            />
          </div>
          <div class="form-group">
            <label class="form-label">State</label>
            <input
              class="form-input"
              value={p.personal.location.state}
              onInput={(e) => updateLocation('state', (e.target as HTMLInputElement).value)}
            />
          </div>
          <div class="form-group">
            <label class="form-label">Country</label>
            <input
              class="form-input"
              value={p.personal.location.country}
              onInput={(e) => updateLocation('country', (e.target as HTMLInputElement).value)}
            />
          </div>
        </div>
      </div>

      {/* Links */}
      <div class="form-section">
        <div class="form-section-title">Links</div>
        <div class="form-group">
          <label class="form-label">LinkedIn</label>
          <input
            class="form-input"
            value={p.personal.linkedIn}
            onInput={(e) => updatePersonal('linkedIn', (e.target as HTMLInputElement).value)}
          />
        </div>
        <div class="form-group">
          <label class="form-label">GitHub</label>
          <input
            class="form-input"
            value={p.personal.github}
            onInput={(e) => updatePersonal('github', (e.target as HTMLInputElement).value)}
          />
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Portfolio</label>
            <input
              class="form-input"
              value={p.personal.portfolio}
              onInput={(e) => updatePersonal('portfolio', (e.target as HTMLInputElement).value)}
            />
          </div>
          <div class="form-group">
            <label class="form-label">Website</label>
            <input
              class="form-input"
              value={p.personal.website}
              onInput={(e) => updatePersonal('website', (e.target as HTMLInputElement).value)}
            />
          </div>
        </div>
      </div>

      {/* Work Experience */}
      <div class="form-section">
        <div class="form-section-title">Work Experience</div>
        {p.work.map((w, i) => (
          <div class="list-item" key={w.id}>
            <div class="list-item-header">
              <strong>{w.title || w.company || 'New Position'}</strong>
              <button class="btn btn-danger btn-sm" onClick={() => removeWork(i)}>
                Remove
              </button>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Company</label>
                <input
                  class="form-input"
                  value={w.company}
                  onInput={(e) => updateWork(i, 'company', (e.target as HTMLInputElement).value)}
                />
              </div>
              <div class="form-group">
                <label class="form-label">Title</label>
                <input
                  class="form-input"
                  value={w.title}
                  onInput={(e) => updateWork(i, 'title', (e.target as HTMLInputElement).value)}
                />
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Start Date</label>
                <input
                  class="form-input"
                  type="month"
                  value={w.startDate}
                  onInput={(e) => updateWork(i, 'startDate', (e.target as HTMLInputElement).value)}
                />
              </div>
              <div class="form-group">
                <label class="form-label">End Date</label>
                <input
                  class="form-input"
                  type="month"
                  value={w.endDate}
                  disabled={w.current}
                  onInput={(e) => updateWork(i, 'endDate', (e.target as HTMLInputElement).value)}
                />
              </div>
            </div>
            <div class="form-group">
              <div class="checkbox-group">
                <input
                  type="checkbox"
                  checked={w.current}
                  onChange={(e) => updateWork(i, 'current', (e.target as HTMLInputElement).checked)}
                />
                <label class="form-label" style="margin: 0">Currently working here</label>
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">Description</label>
              <textarea
                class="form-textarea"
                value={w.description}
                onInput={(e) =>
                  updateWork(i, 'description', (e.target as HTMLTextAreaElement).value)
                }
              />
            </div>
          </div>
        ))}
        <button class="btn btn-secondary" onClick={addWork}>
          + Add Work Experience
        </button>
      </div>

      {/* Education */}
      <div class="form-section">
        <div class="form-section-title">Education</div>
        {p.education.map((edu, i) => (
          <div class="list-item" key={edu.id}>
            <div class="list-item-header">
              <strong>{edu.school || 'New Education'}</strong>
              <button class="btn btn-danger btn-sm" onClick={() => removeEducation(i)}>
                Remove
              </button>
            </div>
            <div class="form-group">
              <label class="form-label">School</label>
              <input
                class="form-input"
                value={edu.school}
                onInput={(e) => updateEducation(i, 'school', (e.target as HTMLInputElement).value)}
              />
            </div>
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Degree</label>
                <input
                  class="form-input"
                  value={edu.degree}
                  onInput={(e) => updateEducation(i, 'degree', (e.target as HTMLInputElement).value)}
                />
              </div>
              <div class="form-group">
                <label class="form-label">Field of Study</label>
                <input
                  class="form-input"
                  value={edu.field}
                  onInput={(e) => updateEducation(i, 'field', (e.target as HTMLInputElement).value)}
                />
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Start Date</label>
                <input
                  class="form-input"
                  type="month"
                  value={edu.startDate}
                  onInput={(e) =>
                    updateEducation(i, 'startDate', (e.target as HTMLInputElement).value)
                  }
                />
              </div>
              <div class="form-group">
                <label class="form-label">End Date</label>
                <input
                  class="form-input"
                  type="month"
                  value={edu.endDate}
                  onInput={(e) =>
                    updateEducation(i, 'endDate', (e.target as HTMLInputElement).value)
                  }
                />
              </div>
              <div class="form-group">
                <label class="form-label">GPA</label>
                <input
                  class="form-input"
                  value={edu.gpa ?? ''}
                  onInput={(e) => updateEducation(i, 'gpa', (e.target as HTMLInputElement).value)}
                />
              </div>
            </div>
          </div>
        ))}
        <button class="btn btn-secondary" onClick={addEducation}>
          + Add Education
        </button>
      </div>

      {/* Skills */}
      <div class="form-section">
        <div class="form-section-title">Skills</div>
        <div class="tags-container">
          {p.skills.map((skill) => (
            <span class="tag" key={skill}>
              {skill}
              <span class="tag-remove" onClick={() => removeSkill(skill)}>
                x
              </span>
            </span>
          ))}
        </div>
        <div class="form-group" style="margin-top: 8px">
          <input
            class="form-input"
            placeholder="Type a skill and press Enter"
            onKeyDown={addSkill}
          />
        </div>
      </div>

      {/* Languages */}
      <div class="form-section">
        <div class="form-section-title">Languages</div>
        {p.languages.map((lang, i) => (
          <div class="form-row" key={i} style="margin-bottom: 8px">
            <div class="form-group">
              <input
                class="form-input"
                placeholder="Language"
                value={lang.language}
                onInput={(e) => updateLanguage(i, 'language', (e.target as HTMLInputElement).value)}
              />
            </div>
            <div class="form-group">
              <select
                class="form-select"
                value={lang.proficiency}
                onChange={(e) =>
                  updateLanguage(i, 'proficiency', (e.target as HTMLSelectElement).value)
                }
              >
                <option value="">Proficiency</option>
                <option value="Native">Native</option>
                <option value="Fluent">Fluent</option>
                <option value="Advanced">Advanced</option>
                <option value="Intermediate">Intermediate</option>
                <option value="Beginner">Beginner</option>
              </select>
            </div>
            <button class="btn btn-danger btn-sm" onClick={() => removeLanguage(i)}>
              x
            </button>
          </div>
        ))}
        <button class="btn btn-secondary" onClick={addLanguage}>
          + Add Language
        </button>
      </div>

      {/* Preferences */}
      <div class="form-section">
        <div class="form-section-title">Preferences</div>
        <div class="form-group">
          <div class="checkbox-group">
            <input
              type="checkbox"
              checked={p.preferences.authorizedToWork}
              onChange={(e) =>
                updatePreference('authorizedToWork', (e.target as HTMLInputElement).checked)
              }
            />
            <label class="form-label" style="margin: 0">Authorized to work</label>
          </div>
        </div>
        <div class="form-group">
          <div class="checkbox-group">
            <input
              type="checkbox"
              checked={p.preferences.requiresSponsorship}
              onChange={(e) =>
                updatePreference('requiresSponsorship', (e.target as HTMLInputElement).checked)
              }
            />
            <label class="form-label" style="margin: 0">Requires sponsorship</label>
          </div>
        </div>
        <div class="form-group">
          <div class="checkbox-group">
            <input
              type="checkbox"
              checked={p.preferences.willingToRelocate}
              onChange={(e) =>
                updatePreference('willingToRelocate', (e.target as HTMLInputElement).checked)
              }
            />
            <label class="form-label" style="margin: 0">Willing to relocate</label>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Salary Expectation</label>
            <input
              class="form-input"
              value={p.preferences.salaryExpectation}
              onInput={(e) =>
                updatePreference('salaryExpectation', (e.target as HTMLInputElement).value)
              }
            />
          </div>
          <div class="form-group">
            <label class="form-label">Start Date</label>
            <input
              class="form-input"
              type="date"
              value={p.preferences.startDate}
              onInput={(e) =>
                updatePreference('startDate', (e.target as HTMLInputElement).value)
              }
            />
          </div>
        </div>
      </div>

      <button class="btn btn-primary" style="width: 100%" onClick={handleSave}>
        Save Profile
      </button>
    </div>
  );
}
