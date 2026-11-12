'use strict';

function fiscalYear(date) {
  const parts = new Intl.DateTimeFormat('en-US-u-ca-persian-nu-latn', {
    timeZone: 'Asia/Tehran',
    year: 'numeric',
  }).formatToParts(date);
  return Number(parts.find((part) => part.type === 'year').value);
}

function prefixFor(type) {
  return {
    PURCHASE_ORDER: 'PO',
    PURCHASE_INVOICE: 'PI',
    PURCHASE_RETURN: 'PR',
    SALES_ORDER: 'SO',
    SALES_INVOICE: 'SI',
    SALES_RETURN: 'SR',
  }[type];
}

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('commercial_documents', 'fiscal_year', {
      type: Sequelize.INTEGER,
      allowNull: true,
    });

    const indexes = await queryInterface.showIndex('commercial_documents');
    for (const index of indexes.filter((item) => item.unique && item.fields.some((field) => field.attribute === 'document_no'))) {
      await queryInterface.removeIndex('commercial_documents', index.name);
    }

    await queryInterface.createTable('commercial_document_number_sequences', {
      document_type: { type: Sequelize.STRING(30), allowNull: false, primaryKey: true },
      fiscal_year: { type: Sequelize.INTEGER, allowNull: false, primaryKey: true },
      last_number: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });

    const [documents] = await queryInterface.sequelize.query(
      'SELECT id, document_type, document_no, created_at FROM commercial_documents ORDER BY document_type, created_at, id',
    );
    const counters = new Map();

    for (const document of documents) {
      const prefix = prefixFor(document.document_type);
      if (!prefix) throw new Error(`Unknown commercial document type: ${document.document_type}`);
      const year = fiscalYear(new Date(document.created_at));
      await queryInterface.sequelize.query(
        'UPDATE commercial_documents SET fiscal_year = :year WHERE id = :id',
        { replacements: { year, id: document.id } },
      );

      const match = String(document.document_no).match(new RegExp(`^${prefix}-(\\d{6})$`));
      if (match) {
        const key = `${document.document_type}:${year}`;
        counters.set(key, Math.max(counters.get(key) || 0, Number(match[1])));
      }
    }

    await queryInterface.changeColumn('commercial_documents', 'fiscal_year', {
      type: Sequelize.INTEGER,
      allowNull: false,
    });

    const now = new Date();
    for (const [key, lastNumber] of counters) {
      const separator = key.lastIndexOf(':');
      await queryInterface.bulkInsert('commercial_document_number_sequences', [{
        document_type: key.slice(0, separator),
        fiscal_year: Number(key.slice(separator + 1)),
        last_number: lastNumber,
        created_at: now,
        updated_at: now,
      }]);
    }

    await queryInterface.addIndex('commercial_documents', ['document_type', 'fiscal_year', 'document_no'], {
      name: 'commercial_documents_type_year_no_uq',
      unique: true,
    });
  },

  async down(queryInterface) {
    const indexes = await queryInterface.showIndex('commercial_documents');
    const scopedIndex = indexes.find((item) => item.name === 'commercial_documents_type_year_no_uq');
    if (scopedIndex) await queryInterface.removeIndex('commercial_documents', scopedIndex.name);

    await queryInterface.addIndex('commercial_documents', ['document_no'], {
      name: 'commercial_documents_document_no_uq',
      unique: true,
    });
    await queryInterface.removeColumn('commercial_documents', 'fiscal_year');
    await queryInterface.dropTable('commercial_document_number_sequences');
  },
};
