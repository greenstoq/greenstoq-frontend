import React from 'react';
import { FormattedMessage } from '../../util/reactIntl';
import { Heading, H2 } from '../../components';
import css from './ListingPage.module.css';
import cssDocuments from './DocumentsTable.module.css';

const SectionDocuments = props => {
  const { documents, fetchDocumentsError } = props;

  return (
    <section className={css.sectionReviews}>
      <Heading as="h2" rootClassName={css.sectionHeadingWithExtraMargin}>
        <FormattedMessage id="ListingPage.documentsTitle" values={{ count: documents.length }} />
      </Heading>
      {fetchDocumentsError ? (
        <H2 className={css.errorText}>
          <FormattedMessage id="ListingPage.reviewsError" />
        </H2>
      ) : null }
      { documents.length > 0 ? (
        <div className={cssDocuments.tableContainer}>
          <table className={cssDocuments.documentsTable}>
            <thead>
            <tr>
              <th>Document Name</th>
            </tr>
            </thead>
            <tbody>
            {documents.map((doc, index) => (
              <tr key={index}>
                <td align={'center'}>
                  <a href={doc.url} target="_blank" rel="noopener noreferrer">
                    {doc.name}
                  </a>
                </td>
              </tr>
            ))}
            </tbody>
          </table>
        </div>
        ) : null}
    </section>
  );
};

export default SectionDocuments;
